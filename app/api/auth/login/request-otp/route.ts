import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/gmail";
import { TokenService } from "@/lib/jwt";

// POST /api/auth/login/request-otp
// Dual-mode endpoint:
// - Mode A (token-authenticated resend): If a valid accessToken cookie exists, use it to identify the user.
// - Mode B (credentials-init): If no valid token, require { email, password } to initiate the OTP flow.
export async function POST(request: NextRequest) {
  try {
    // Try Mode A: token-authenticated resend (no password required)
    const cookieToken = request.cookies.get("accessToken")?.value;
    if (cookieToken) {
      try {
        const payload = await TokenService.verifyAccessToken(cookieToken);
        const emailFromToken = (payload.email || "").toLowerCase();
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
            return NextResponse.json(
              { error: "Account is not active" },
              { status: 403 }
            );
          }

          // If 2FA is enabled, this flow should move to TOTP-based verification
          if (user.isTOTPEnabled) {
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

          // Send email
          const sent = await sendOTPEmail(user.email, otp, user.name || "User");
          if (!sent) {
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

          const res = NextResponse.json({ success: true, message: "Verification code sent" });
          res.cookies.set("accessToken", preAuthAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60,
          });
          return res;
        }
      } catch {
        // Token invalid/expired → fall back to Mode B
      }
    }

    // Mode B: credentials-init (email + password required)
    const body = await request.json().catch(() => null);
    const emailRaw = body?.email as string | undefined;
    const password = body?.password as string | undefined;

    if (!emailRaw || !password) {
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
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.isTOTPEnabled) {
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

    // Send email
    const sent = await sendOTPEmail(email, otp, user.name || "User");
    if (!sent) {
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

    const res = NextResponse.json({ success: true, message: "Verification code sent" });
    res.cookies.set("accessToken", preAuthAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 minutes
    });
    return res;
  } catch (error) {
    console.error("request-otp error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
