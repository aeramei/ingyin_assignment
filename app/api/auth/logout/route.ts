import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TokenService } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const refreshTokenCookie = request.cookies.get("refreshToken")?.value;

    if (refreshTokenCookie) {
      try {
        // We don't need to verify the token to get the user ID, just decode it.
        const decoded = TokenService.decodeToken(refreshTokenCookie);
        const userId = decoded?.userId;

        // Delete the refresh token from the database
        await prisma.refreshToken.deleteMany({
          where: {
            token: refreshTokenCookie,
          },
        });

        if (userId) {
          // Invalidate all access tokens for the user as well for added security
          await prisma.token.deleteMany({
            where: {
              userId: userId,
            },
          });

          // Create audit log
          await prisma.auditLog.create({
            data: {
              userId: userId,
              action: "LOGOUT",
              ipAddress: request.headers.get("x-forwarded-for") || "unknown",
              userAgent: request.headers.get("user-agent") || "unknown",
            },
          });
        }
      } catch (error) {
        // Even if there's an error, we proceed to clear cookies
        console.error("Error during token invalidation on logout:", error);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear all relevant auth cookies
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    response.cookies.delete("otp_temp_token"); // Also clear any pending OTP tokens

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
