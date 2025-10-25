// app/api/auth/verify-otp/route.ts
import { NextResponse } from "next/server";
import { verifyOTP } from "@/lib/otp";
import {
  createUser,
  findUserByEmail,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger } from "@/lib/logger";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const log = createRequestLogger("verify-otp");
  const start = Date.now();
  try {
    const { email, otp, name } = await request.json();

    // Validate input
    if (!email || !otp) {
      log.warn("Missing email or otp in payload");
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    if (otp.length !== 6) {
      log.warn("OTP not 6 digits");
      return NextResponse.json(
        { error: "OTP must be 6 digits" },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(email, otp);
    log.debug("OTP verification result", { isValid });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // OTP is valid - proceed with user registration/login
    let isNewUser = false;
    let user = await findUserByEmail(email);
    log.debug("User lookup", { exists: Boolean(user) });

    if (!user) {
      // New user - create account
      if (!name) {
        log.warn("Name missing for first-time registration");
        return NextResponse.json(
          { error: "Name is required for registration" },
          { status: 400 }
        );
      }
      user = await createUser({ email, name });
      isNewUser = true;
      log.info("Created user via OTP verification", { userId: user.id });
    }

    // If user has 2FA enabled, this endpoint should not complete login (out of scope now)
    if (user.isTOTPEnabled) {
      log.warn("TOTP-enabled account attempted OTP email flow", { userId: user.id });
      return NextResponse.json(
        { error: "Two-factor authentication is enabled. Use 2FA flow." },
        { status: 400 }
      );
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      username: user.email,
      email: user.email,
      name: user.name ?? undefined,
      role: user.role,
      isTOTPEnabled: user.isTOTPEnabled,
      otpRequired: false,
      otpVerified: true,
    } as const;

    const accessToken = await generateAccessToken(tokenPayload as any);
    const refreshToken = await generateRefreshToken(tokenPayload as any);
    log.debug("Tokens generated");

    // Persist a session tied to the refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    log.debug("Refresh session persisted", { userId: user.id });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: isNewUser ? "REGISTER_WITH_OTP" : "LOGIN_WITH_OTP",
        ipAddress: (request.headers as any).get?.("x-forwarded-for") || "unknown",
        userAgent: (request.headers as any).get?.("user-agent") || "unknown",
        details: isNewUser ? { method: "OTP_VERIFICATION" } : { method: "OTP_LOGIN" },
      },
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: isNewUser ? "Registration successful" : "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Set HTTP-only cookies, aligned with register route
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60,
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
    });

    // Also clear any legacy auth-token cookie
    response.cookies.delete("auth-token");

    log.info("OTP verification completed; cookies set and response prepared", { userId: user.id, isNewUser });
    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  } finally {
    const ms = Date.now() - start;
    log.debug("verify-otp finished", { durationMs: ms });
    await prisma.$disconnect();
  }
}
