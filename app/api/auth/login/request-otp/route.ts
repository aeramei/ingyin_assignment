import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/gmail";
import { TokenService } from "@/lib/jwt";
import { createRequestLogger } from "@/lib/logger";

// POST /api/auth/login/request-otp
// Dual-mode endpoint:
// - Mode A (token-authenticated resend): If a valid accessToken cookie exists, use it to identify the user.
// - Mode B (credentials-init): If no valid token, require { email, password } to initiate the OTP flow.
export async function POST(request: NextRequest) {
  const log = createRequestLogger("login/request-otp");
  const start = Date.now();
  try {
    // Try Mode A: token-authenticated resend (no password required)
    const cookieToken = request.cookies.get("accessToken")?.value;
    if (cookieToken) {
      try {
        const payload = await TokenService.verifyAccessToken(cookieToken);
        const emailFromToken = (payload.email || "").toLowerCase();
        log.debug("Mode A: token present", { emailDomain: emailFromToken.split("@")[1] || null });
        if (emailFromToken) {
          const user = await prisma.user.findUnique({
            where: { email: emailFromToken },
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
              isTOTPEnabled: true,
              role: true,
            },
          });

          if (!user || user.status !== "ACTIVE") {
            log.warn("Account not active or missing", { emailDomain: emailFromToken.split("@")[1] || null });
            return NextResponse.json(
              { error: "Account is not active" },
              { status: 403 }
            );
          }

          // If 2FA is enabled, this flow should move to TOTP-based verification
          if (user.isTOTPEnabled) {
            log.info("TOTP enabled; skipping email OTP flow", { userId: user.id });
            return NextResponse.json(
              {
                requires2FA: true,
                message:
                  "Two-factor authentication is enabled; continue with 2FA verification.",
              },
              { status: 200 }
            );
          }

          // Generate and store OTP
          const otp = generateOTP();
          await storeOTP(user.email, otp);
          log.debug("OTP generated and stored", { userId: user.id });

          // Send email
          const sent = await sendOTPEmail(user.email, otp, user.name || "User");
          if (!sent) {
            log.error("Failed to send OTP email", { userId: user.id });
            return NextResponse.json(
              { error: "Failed to send verification code" },
              { status: 500 }
            );
          }

          // Refresh short-lived pre-auth access token to extend the OTP window
          const preAuthPayload = {
            userId: user.id,
            username: user.email,
            email: user.email,
            name: user.name || undefined,
            role: user.role || "USER",
            isTOTPEnabled: user.isTOTPEnabled,
            otpRequired: true,
            otpVerified: false,
          } as const;
          const preAuthAccessToken = await TokenService.generateAccessToken(preAuthPayload as any);
          log.debug("Pre-auth access token minted", { userId: user.id });

          // Audit log (OTP re-sent for login)
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "LOGIN_OTP_SENT",
              ipAddress: request.headers.get("x-forwarded-for") || "unknown",
              userAgent: request.headers.get("user-agent") || "unknown",
              details: { purpose: "login_resend", ttlMinutes: 10 },
            },
          });
          log.debug("Audit log recorded", { userId: user.id });

          const res = NextResponse.json({ success: true, message: "Verification code sent" });
          res.cookies.set("accessToken", preAuthAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60,
          });
          return res;
        }
      } catch (e) {
        log.debug("Mode A token invalid/expired; falling back to Mode B");
        // Token invalid/expired → fall back to Mode B
      }
    }

    // Mode B: credentials-init (email + password required)
    const body = await request.json().catch(() => null);
    const emailRaw = body?.email as string | undefined;
    const password = body?.password as string | undefined;

    if (!emailRaw || !password) {
      log.warn("Missing credentials in Mode B");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const email = emailRaw.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        status: true,
        isTOTPEnabled: true,
        role: true,
      },
    });

    // Unify response for invalid credentials without leaking user existence
    if (!user || !user.password || user.status !== "ACTIVE") {
      log.warn("Invalid credentials or inactive user", { emailDomain: email.split("@")[1] || null });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      log.warn("Password mismatch", { userId: user.id });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.isTOTPEnabled) {
      log.info("TOTP enabled; instructing to continue with 2FA", { userId: user.id });
      return NextResponse.json(
        {
          requires2FA: true,
          message: "Two-factor authentication is enabled; continue with 2FA verification.",
        },
        { status: 200 }
      );
    }

    // Generate and store OTP
    const otp = generateOTP();
    await storeOTP(email, otp);
    log.debug("OTP generated and stored", { userId: user.id });

    // Send email
    const sent = await sendOTPEmail(email, otp, user.name || "User");
    if (!sent) {
      log.error("Failed to send OTP email", { userId: user.id });
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 }
      );
    }

    // Issue short-lived pre-auth access token: requires OTP
    const preAuthPayload = {
      userId: user.id,
      username: user.email, // alias for compatibility
      email: user.email,
      name: user.name || undefined,
      role: user.role || "USER",
      isTOTPEnabled: user.isTOTPEnabled,
      otpRequired: true,
      otpVerified: false,
    } as const;

    const preAuthAccessToken = await TokenService.generateAccessToken(preAuthPayload as any);
    log.debug("Pre-auth access token minted", { userId: user.id });

    // Audit log (OTP sent for login)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_OTP_SENT",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        details: { purpose: "login", ttlMinutes: 10 },
      },
    });
    log.debug("Audit log recorded", { userId: user.id });

    const res = NextResponse.json({ success: true, message: "Verification code sent" });
    res.cookies.set("accessToken", preAuthAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 minutes
    });
    return res;
  } catch (error) {
    log.error("request-otp error", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    const ms = Date.now() - start;
    log.debug("Request finished", { durationMs: ms });
  }
}
