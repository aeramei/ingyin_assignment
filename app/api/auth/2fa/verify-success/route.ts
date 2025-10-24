import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Set TOTP verified cookie (short-lived for security)
    const response = NextResponse.json({ success: true });

    response.cookies.set("totp_verified", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    response.cookies.set("user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes
      path: "/",
    });

    // Log successful TOTP verification
    await prisma.auditLog.create({
      data: {
        userId,
        action: "TOTP_VERIFIED",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return response;
  } catch (error) {
    console.error("TOTP verification success error:", error);
    return NextResponse.json(
      { error: "Failed to process verification" },
      { status: 500 }
    );
  }
}
