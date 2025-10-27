import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/lib/jwt";
import { TOTPAuth } from "@/lib/totp-auth";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger, redact } from "@/lib/logger";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const log = createRequestLogger("auth/verify-totp");
  try {
    const {
      totpToken: bodyToken,
      verificationCode,
      useBackupCode = false,
    } = await request.json();
    log.debug("Incoming verify-totp payload", {
      hasBodyToken: !!bodyToken,
      codeLength: verificationCode ? String(verificationCode).length : 0,
      useBackupCode,
    });

    // Try to get token from body first, then from cookies
    let totpToken = bodyToken;

    if (!totpToken) {
      // Check if token is in cookies (for OAuth flow)
      const cookieToken = request.cookies.get("totp_temp_token")?.value;
      log.debug("Attempted to read token from cookie", { hasCookieToken: !!cookieToken });
      if (cookieToken) {
        totpToken = cookieToken;
      }
    }

    log.debug("Final TOTP token source", {
        fromBody: !!bodyToken,
        fromCookie: !bodyToken && !!totpToken,
        token: redact(totpToken),
    });

    if (!totpToken || !verificationCode) {
      log.warn("Missing token or code", {
          hasToken: !!totpToken,
          hasCode: !!verificationCode,
      });
      return NextResponse.json(
        { error: "TOTP token and verification code are required" },
        { status: 400 }
      );
    }

    // Verify the TOTP verification token
    const tokenPayload = await TokenService.verifyTOTPToken(totpToken);
    log.debug("TOTP token verified", { userId: tokenPayload.userId, email: tokenPayload.email });


    let isValid = false;

    if (useBackupCode) {
      log.debug("Verifying backup code...");
      // Verify backup code
      isValid = await TOTPAuth.verifyBackupCode(
        tokenPayload.userId,
        verificationCode
      );
      log.debug("Backup code verification result", { isValid });
    } else {
      log.debug("Verifying TOTP code...");
      // Verify TOTP code
      const result = await TOTPAuth.verifyTOTP(
        tokenPayload.userId,
        verificationCode
      );
      isValid = result.success;
      log.debug("TOTP code verification result", { isValid, delta: result.success });
    }

    if (!isValid) {
      log.warn("Invalid verification code", { userId: tokenPayload.userId });
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    log.info("Verification code is valid", { userId: tokenPayload.userId });

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        plan: true,
        isTOTPEnabled: true,
      },
    });

    if (!user) {
      log.error("User not found after successful TOTP verification", { userId: tokenPayload.userId });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    log.debug("User found, generating final tokens...");

    // Generate FINAL access token with TOTP verified
    const finalAccessToken = await TokenService.generateAccessToken(
      {
        userId: user.id,
        email: user.email,
        username: user.email,
        name: user.name || undefined,
        role: user.role,
        isTOTPEnabled: user.isTOTPEnabled,
      }
    );

    const refreshToken = await TokenService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      username: user.email,
      name: user.name || undefined,
      role: user.role,
      isTOTPEnabled: user.isTOTPEnabled,
    });

    log.debug("Final tokens generated");

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    log.debug("Session created");

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_TOTP_VERIFIED",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        details: {
          method: useBackupCode ? "backup_code" : "totp_code",
          success: true,
          source: bodyToken ? "regular_login" : "oauth_login",
        },
      },
    });
    log.debug("Audit log created");

    // Prepare response
    const response = NextResponse.json({
      success: true,
      message: "TOTP verification successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        plan: user.plan,
        isTOTPEnabled: user.isTOTPEnabled,
      },
    });

    // Set final cookies
    response.cookies.set("accessToken", finalAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Clear the temporary TOTP cookie if it exists
    response.cookies.delete("totp_temp_token");

    // Set TOTP verified flag
    response.cookies.set("totp_verified", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    log.info("Successfully verified TOTP and returning response");
    return response;
  } catch (error) {
    log.error("TOTP verification error", { error: error instanceof Error ? error.message : String(error) });

    if (error instanceof Error && error.message.includes("expired")) {
      return NextResponse.json(
        { error: "TOTP verification session expired. Please login again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "TOTP verification failed" },
      { status: 500 }
    );
  }
}
