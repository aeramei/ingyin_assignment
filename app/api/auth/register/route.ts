import { NextRequest, NextResponse } from "next/server";

import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";

// Use direct Prisma client for now to avoid import issues
import { PrismaClient } from "@/app/generated/prisma";
const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log("Register endpoint hit");

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

    const { email, password, name, company, plan } = body;

    // Validation - NOW INCLUDING COMPANY AND PLAN
    if (!email || !password || !name || !company || !plan) {
      return NextResponse.json(
        { error: "Email, password, name, company, and plan are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

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
        company: company || "Not specified", // ✅ ADD THIS
        plan: plan || "starter", // ✅ ADD THIS
        role: "USER",
        status: "ACTIVE",
      },
    });
    console.log("User created:", user.id);

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
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
        action: "REGISTER",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        details: {
          company: company,
          plan: plan,
        },
      },
    });
    console.log("Audit log created");

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company, // ✅ Include in response
        plan: user.plan, // ✅ Include in response
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

    console.log("Registration completed successfully");
    return response;
  } catch (error) {
    console.error("Registration error:", error);

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
