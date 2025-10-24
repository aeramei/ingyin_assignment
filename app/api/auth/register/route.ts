import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/otp";
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";
import {
  validatePassword,
  defaultRequirements,
} from "@/lib/passwordValidation"; // ✅ ADD THIS IMPORT

// Use direct Prisma client for now to avoid import issues
import { PrismaClient } from "@/app/generated/prisma";
const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log("Verify OTP Register endpoint hit");

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log("Request body:", body);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { email, password, name, company, plan, otp } = body;

    // ✅ ADD OTP VALIDATION
    if (!otp) {
      return NextResponse.json({ error: "OTP is required" }, { status: 400 });
    }

    // Validation - INCLUDING OTP NOW
    if (!email || !password || !name || !company || !plan || !otp) {
      return NextResponse.json(
        { error: "Email, password, name, company, plan, and OTP are required" },
        { status: 400 }
      );
    }

    // ✅ ENHANCED PASSWORD VALIDATION
    const passwordValidation = validatePassword(password, defaultRequirements, {
      email,
      name,
      company,
    });

    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: "Password does not meet security requirements",
          details: passwordValidation.errors,
          suggestions: passwordValidation.suggestions,
        },
        { status: 400 }
      );
    }

    if (otp.length !== 6) {
      return NextResponse.json(
        { error: "OTP must be 6 digits" },
        { status: 400 }
      );
    }

    // ✅ VERIFY OTP FIRST
    console.log("Verifying OTP for email:", email);
    const isOTPValid = await verifyOTP(email, otp);

    if (!isOTPValid) {
      console.log("Invalid OTP provided:", otp);
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    console.log("OTP verified successfully");

    // Test database connection first
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database connection successful");
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    console.log("Password hashed successfully");

    // Create user - NOW INCLUDING COMPANY AND PLAN
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        company: company || "Not specified",
        plan: plan || "starter",
        role: "USER",
        status: "ACTIVE",
      },
    });
    console.log("User created:", user.id);

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name ?? undefined,
      role: user.role,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);
    console.log("Tokens generated");

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
    console.log("Session created");

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "REGISTER_WITH_OTP", // ✅ Changed to reflect OTP registration
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        details: {
          company: company,
          plan: plan,
          method: "OTP_VERIFICATION", // ✅ Added OTP method
          passwordStrength: passwordValidation.strength, // ✅ Added password strength
        },
      },
    });
    console.log("Audit log created");

    const response = NextResponse.json({
      success: true,
      message: "Registration completed successfully with OTP verification",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        plan: user.plan,
      },
    });

    // Set HTTP-only cookies
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    console.log("OTP Registration completed successfully");
    return response;
  } catch (error) {
    console.error("OTP Registration error:", error);

    // Provide more specific error messages
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    // Close Prisma connection
    await prisma.$disconnect();
  }
}
