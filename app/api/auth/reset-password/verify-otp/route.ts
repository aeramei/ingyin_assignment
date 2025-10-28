import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger } from "@/lib/logger";
import { TokenService } from "@/lib/jwt";
import { verifyOTP } from "@/lib/otp";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const log = createRequestLogger("auth/reset-password/verify-otp");
  try {
    const { verificationCode } = await request.json();
    const resetToken = request.cookies.get("password_reset_token")?.value;

    if (!resetToken) {
      return NextResponse.json(
        { error: "Password reset session not found. Please try again." },
        { status: 400 }
      );
    }

    if (!verificationCode) {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    const payload = await TokenService.verifyTOTPToken(resetToken);
    const isValid = await verifyOTP(
      payload.email, // Change from userId to email
      verificationCode
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    const finalToken = await TokenService.generateTOTPVerificationToken(
      payload.userId,
      payload.email,
      payload.email,
      "USER"
    );
    const response = NextResponse.json({ success: true });
    response.cookies.set("password_reset_final_token", finalToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 60, // 5 minutes
      path: "/",
    });
    response.cookies.delete("password_reset_token");

    return response;
  } catch (error: any) {
    log.error("Password reset OTP verification error", {
      error: error.message,
    });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
