import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (refreshToken) {
      try {
        // Only try to verify if we have an access token
        if (accessToken) {
          const payload = verifyAccessToken(accessToken);

          // Delete session
          await prisma.session.deleteMany({
            where: {
              token: refreshToken,
            },
          });

          // Create audit log
          await prisma.auditLog.create({
            data: {
              userId: payload.userId,
              action: "LOGOUT",
              ipAddress: request.headers.get("x-forwarded-for") || "unknown",
              userAgent: request.headers.get("user-agent") || "unknown",
            },
          });
        }
      } catch (error) {
        // Token might be expired, but we still want to clear cookies
        console.log("Token expired during logout, clearing cookies");
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear cookies
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
