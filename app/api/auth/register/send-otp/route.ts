// app/api/auth/register/send-otp/route.ts - ALTERNATIVE
import { NextResponse } from "next/server";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/gmail";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    console.log("Send OTP request received:", { email, name });

    // Validate input
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate OTP
    const otp = generateOTP();
    console.log("Generated OTP for registration:", otp);

    // ✅ Pass all three parameters if storeOTP expects them
    await storeOTP(email, otp, name);
    console.log("OTP stored for email:", email);

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, name || "New User");

    if (!emailSent) {
      console.error("Failed to send OTP email to:", email);
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    console.log("OTP sent successfully to:", email);

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
