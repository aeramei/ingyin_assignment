// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { TokenService } from "@/lib/jwt";
import { PrismaClient } from "@/app/generated/prisma";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/gmail"; // Import your existing email service

// ✅ reCAPTCHA VERIFICATION FUNCTION
async function verifyRecaptcha(
  token: string
): Promise<{ success: boolean; score?: number }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    throw new Error("RECAPTCHA_SECRET_KEY not configured");
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    if (!response.ok) {
      throw new Error(
        `reCAPTCHA API responded with status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log("reCAPTCHA verification response:", data);
    return data;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    throw new Error("Failed to verify reCAPTCHA token");
  }
}

export async function POST(request: NextRequest) {
  let prisma;

  try {
    prisma = new PrismaClient();

    const { email, password, recaptchaToken } = await request.json();

    console.log("Login attempt for:", email);

    // ✅ VALIDATE reCAPTCHA TOKEN FIRST
    if (!recaptchaToken) {
      console.error("No reCAPTCHA token provided");
      return NextResponse.json(
        {
          error: "Security verification failed. Please complete the reCAPTCHA.",
        },
        { status: 400 }
      );
    }

    // ✅ VERIFY reCAPTCHA
    console.log("Verifying reCAPTCHA token...");
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);

    if (!recaptchaResult.success) {
      console.error("reCAPTCHA verification failed:", recaptchaResult);
      return NextResponse.json(
        { error: "Security verification failed. Please try again." },
        { status: 400 }
      );
    }

    console.log("reCAPTCHA verification passed");

    // ✅ BASIC VALIDATION
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // ✅ FIND USER WITH TOTP STATUS
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        status: true,
        company: true,
        plan: true,
        isTOTPEnabled: true,
        verified: true,
      },
    });

    if (!user) {
      console.log("User not found:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ✅ CHECK USER STATUS
    if (user.status !== "ACTIVE") {
      console.log("Inactive user attempt:", email);
      return NextResponse.json(
        { error: "Account is not active. Please contact support." },
        { status: 401 }
      );
    }

    // ✅ VERIFY PASSWORD
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      console.log("Invalid password for user:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log("Password verified for user:", user.id);

    // ✅ CHECK IF USER NEEDS OTP VERIFICATION (when TOTP is disabled)
    if (!user.isTOTPEnabled) {
      console.log("TOTP not enabled, requiring email OTP for user:", user.id);

      // ✅ GENERATE OTP CODE
      const otpCode = generateOTP();
      console.log(`Generated OTP for ${user.email}: ${otpCode}`);

      // ✅ STORE OTP IN MEMORY STORE
      await storeOTP(user.email, otpCode);

      // ✅ SEND OTP VIA EMAIL USING YOUR EXISTING SERVICE
      const emailSent = await sendOTPEmail(
        user.email,
        otpCode,
        user.name || "User"
      );

      if (!emailSent) {
        throw new Error("Failed to send verification email");
      }

      // Generate OTP verification token (for email OTP)
      const otpToken = await TokenService.generateTOTPVerificationToken(
        user.id,
        user.email,
        user.email,
        user.role,
        user.name || undefined
      );

      // ✅ CREATE AUDIT LOG FOR OTP REQUIRED
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN_OTP_REQUIRED",
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          details: {
            recaptchaVerified: true,
            recaptchaScore: recaptchaResult.score || 0,
            loginMethod: "email_password",
            verificationType: "email_otp",
            otpSent: true,
            emailService: "gmail",
          },
        },
      });

      // Set a short-lived cookie with the temp OTP token
      const res = NextResponse.json({
        success: true,
        requiresOTP: true,
        message: "Email verification code sent to your email",
        userId: user.id,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });

      res.cookies.set("otp_temp_token", otpToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60, // 10 minutes
        path: "/",
      });

      return res;
    }

    // ✅ TOTP ENABLED - Generate TOTP verification token
    console.log("TOTP enabled, requiring TOTP verification for user:", user.id);

    const totpToken = await TokenService.generateTOTPVerificationToken(
      user.id,
      user.email,
      user.email,
      user.role,
      user.name || undefined
    );

    // ✅ CREATE AUDIT LOG FOR TOTP REQUIRED
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_TOTP_REQUIRED",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        details: {
          recaptchaVerified: true,
          recaptchaScore: recaptchaResult.score || 0,
          loginMethod: "email_password",
          verificationType: "totp",
        },
      },
    });

    // Set a short-lived cookie with the temp TOTP token
    const res = NextResponse.json({
      success: true,
      requiresTOTP: true,
      message: "TOTP verification required",
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    res.cookies.set("totp_temp_token", totpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("reCAPTCHA") ||
        error.message.includes("RECAPTCHA")
      ) {
        return NextResponse.json(
          { error: "Security service unavailable. Please try again later." },
          { status: 503 }
        );
      }

      if (
        error.message.includes("Prisma") ||
        error.message.includes("database")
      ) {
        return NextResponse.json(
          { error: "Database connection error. Please try again." },
          { status: 503 }
        );
      }

      if (error.message.includes("email") || error.message.includes("Email")) {
        return NextResponse.json(
          { error: "Failed to send verification email. Please try again." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}
