import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/lib/jwt";
import { TOTPAuth } from "@/lib/totp-auth";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const {
      totpToken: bodyToken,
      verificationCode,
      useBackupCode = false,
    } = await request.json();

    // Try to get token from body first, then from cookies
    let totpToken = bodyToken;

    if (!totpToken) {
      // Check if token is in cookies (for OAuth flow)
      const cookieToken = request.cookies.get("totp_temp_token")?.value;
      if (cookieToken) {
        totpToken = cookieToken;
      }
    }

    if (!totpToken || !verificationCode) {
      return NextResponse.json(
        { error: "TOTP token and verification code are required" },
        { status: 400 }
      );
    }

    // Verify the TOTP verification token
    const tokenPayload = await TokenService.verifyTOTPToken(totpToken);

    let isValid = false;

    if (useBackupCode) {
      // Verify backup code
      isValid = await TOTPAuth.verifyBackupCode(
        tokenPayload.userId,
        verificationCode
      );
    } else {
      // Verify TOTP code
      const result = await TOTPAuth.verifyTOTP(
        tokenPayload.userId,
        verificationCode
      );
      isValid = result.success;
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate FINAL access token with TOTP verified
    const finalAccessToken = await TokenService.generateAccessToken(
      {
        userId: user.id,
        email: user.email,
        username: user.email,
        name: user.name || undefined,
        role: user.role,
        isTOTPEnabled: user.isTOTPEnabled,
      },
      true // totpVerified = true
    );

    const refreshToken = await TokenService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      username: user.email,
      name: user.name || undefined,
      role: user.role,
      isTOTPEnabled: user.isTOTPEnabled,
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

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

    return response;
  } catch (error) {
    console.error("TOTP verification error:", error);

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
