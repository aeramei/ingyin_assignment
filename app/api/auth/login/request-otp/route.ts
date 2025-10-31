import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/gmail";
import { TokenService } from "@/lib/jwt";
import { createRequestLogger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const log = createRequestLogger("login/request-otp");
  const start = Date.now();
  try {
    let userEmailForOTP: string | undefined;
    let userIdForOTP: string | undefined;
    let userNameForOTP: string | undefined;
    let userRoleForOTP: string | undefined;
    let userIsTOTPEnabled = false;

    // Mode A: Resend OTP using existing otp_temp_token
    const tempTokenCookie = request.cookies.get("otp_temp_token")?.value;
    if (tempTokenCookie) {
      log.debug("Mode A: Found otp_temp_token, attempting resend.");
      try {
        // Try to verify it first (it might be valid)
        const payload = await TokenService.verifyTOTPToken(tempTokenCookie);
        userIdForOTP = payload.userId;
        userEmailForOTP = payload.email;
        log.debug("Mode A: Valid otp_temp_token verified.", { userId: userIdForOTP });
      } catch (e) {
        // If verification fails (e.g., expired), decode it to get user info
        log.debug("Mode A: otp_temp_token verification failed, decoding...", { error: String(e) });
        const decoded = TokenService.decodeToken(tempTokenCookie);
        if (decoded?.userId && decoded?.email) {
          userIdForOTP = decoded.userId;
          userEmailForOTP = decoded.email;
          log.debug("Mode A: Decoded expired otp_temp_token.", { userId: userIdForOTP });
        } else {
          log.warn("Mode A: Could not decode otp_temp_token.");
        }
      }
    }

    // If we have user info from the temp token, fetch the user and resend
    if (userIdForOTP && userEmailForOTP) {
      const user = await prisma.user.findUnique({
        where: { id: userIdForOTP },
        select: { id: true, email: true, name: true, status: true, isTOTPEnabled: true, role: true },
      });

      if (!user || user.status !== "ACTIVE") {
        log.warn("Account for resend not active or missing", { userId: userIdForOTP });
        return NextResponse.json({ error: "Account is not active" }, { status: 403 });
      }
      
      // Set user details for the common OTP sending logic below
      userNameForOTP = user.name || undefined;
      userRoleForOTP = user.role;
      userIsTOTPEnabled = user.isTOTPEnabled;

    } else {
      // Mode B: Initial login with email and password
      log.debug("Mode B: No valid otp_temp_token, proceeding with credentials.");
      const body = await request.json().catch(() => null);
      const emailRaw = body?.email as string | undefined;
      const password = body?.password as string | undefined;

      if (!emailRaw || !password) {
        log.warn("Mode B: Missing credentials.");
        return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
      }

      const email = emailRaw.toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, password: true, status: true, isTOTPEnabled: true, role: true },
      });

      if (!user || !user.password || user.status !== "ACTIVE") {
        log.warn("Mode B: Invalid credentials or inactive user", { emailDomain: email.split("@")[1] || null });
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        log.warn("Mode B: Password mismatch", { userId: user.id });
        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }
      
      // Set user details for the common OTP sending logic below
      userIdForOTP = user.id;
      userEmailForOTP = user.email;
      userNameForOTP = user.name || undefined;
      userRoleForOTP = user.role;
      userIsTOTPEnabled = user.isTOTPEnabled;
    }

    // Common logic for sending OTP
    if (!userIdForOTP || !userEmailForOTP || !userRoleForOTP) {
        log.error("Critical error: User details for OTP generation are missing.");
        return NextResponse.json({ error: "Could not identify user for OTP generation." }, { status: 500 });
    }

    // If user has TOTP (Google Authenticator, etc.) enabled, bypass email OTP
    if (userIsTOTPEnabled) {
      log.info("TOTP enabled; instructing to continue with 2FA", { userId: userIdForOTP });
      return NextResponse.json(
        { requires2FA: true, message: "Two-factor authentication is enabled; continue with 2FA verification." },
        { status: 200 }
      );
    }

    // Generate and store a new OTP
    const otp = generateOTP();
    await storeOTP(userEmailForOTP, otp);
    log.debug("OTP generated and stored", { userId: userIdForOTP });

    // Send OTP email
    const sent = await sendOTPEmail(userEmailForOTP, otp, userNameForOTP || "User");
    if (!sent) {
      log.error("Failed to send OTP email", { userId: userIdForOTP });
      return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 });
    }

    // Issue a new short-lived token for the OTP verification step
    const otpTempToken = await TokenService.generateTOTPVerificationToken(
      userIdForOTP,
      userEmailForOTP,
      userEmailForOTP, // username
      userRoleForOTP,
      userNameForOTP
    );
    log.debug("New otp_temp_token minted", { userId: userIdForOTP });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: userIdForOTP,
        action: "LOGIN_OTP_SENT",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        details: { purpose: tempTokenCookie ? "login_resend" : "login_initial", ttlMinutes: 10 },
      },
    });
    log.debug("Audit log recorded", { userId: userIdForOTP });

    const res = NextResponse.json({ success: true, message: "Verification code sent" });
    res.cookies.set("otp_temp_token", otpTempToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60, // 10 minutes
    });
    
    // Clean up old accessToken cookie if it exists from previous failed flows
    res.cookies.delete("accessToken");

    return res;

  } catch (error) {
    log.error("request-otp error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    const ms = Date.now() - start;
    log.debug("Request finished", { durationMs: ms });
  }
}
