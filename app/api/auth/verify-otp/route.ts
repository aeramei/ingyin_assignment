// app/api/auth/verify-otp/route.ts
import { NextResponse } from "next/server";
import { verifyOTP } from "@/lib/otp";
import { createUser, findUserByEmail, generateAccessToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, otp, name } = await request.json();

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    if (otp.length !== 6) {
      return NextResponse.json(
        { error: "OTP must be 6 digits" },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(email, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // OTP is valid - proceed with user registration/login
    let user = await findUserByEmail(email);

    if (!user) {
      // New user - create account
      if (!name) {
        return NextResponse.json(
          { error: "Name is required for registration" },
          { status: 400 }
        );
      }
      user = await createUser({ email, name });
    }

    // Generate session token
    const token = await generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user", // Make sure role is included
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: user ? "Login successful" : "Registration successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Set HTTP-only cookie with token
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
