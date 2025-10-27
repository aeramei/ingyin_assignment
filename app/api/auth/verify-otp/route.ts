import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/lib/jwt";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger } from "@/lib/logger";
import { verifyOTP } from "@/lib/otp";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const log = createRequestLogger("auth/verify-otp");
  try {
    const { verificationCode } = await request.json();
    log.debug("Incoming verify-otp payload", {
      codeLength: verificationCode ? String(verificationCode).length : 0,
    });

    const cookieToken = request.cookies.get("otp_temp_token")?.value;
    if (!cookieToken) {
      log.warn("Missing OTP temp token cookie");
      return NextResponse.json(
        { error: "Verification session not found. Please log in again." },
        { status: 400 }
      );
    }

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    const tokenPayload = await TokenService.verifyTOTPToken(cookieToken);
    log.debug("OTP token verified", { userId: tokenPayload.userId });

    const isValid = await verifyOTP(
      tokenPayload.userId,
      verificationCode
    );

    if (!isValid) {
      log.warn("Invalid OTP code", { userId: tokenPayload.userId });
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    log.info("OTP code is valid", { userId: tokenPayload.userId });

    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: { id: true, email: true, name: true, role: true, isTOTPEnabled: true },
    });

    if (!user) {
      log.error("User not found after OTP verification", { userId: tokenPayload.userId });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accessToken = await TokenService.generateAccessToken({ ...user });
    const refreshToken = await TokenService.generateRefreshToken({ ...user });

    await prisma.session.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            action: "LOGIN_OTP_VERIFIED",
            ipAddress: request.headers.get("x-forwarded-for") || "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
        },
    });

    const response = NextResponse.json({ success: true, ...user });

    response.cookies.set("accessToken", accessToken, {
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

    response.cookies.delete("otp_temp_token");

    return response;
  } catch (error) {
    log.error("OTP verification error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "OTP verification failed" },
      { status: 500 }
    );
  }
}
