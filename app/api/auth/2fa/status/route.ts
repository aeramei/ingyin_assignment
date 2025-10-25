import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { PrismaClient } from "@/app/generated/prisma";
import { verifyAccessToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Try NextAuth session first
    const session = await getServerSession(authOptions);
    let email = session?.user?.email ?? null;

    // If no NextAuth session, fallback to our JWT cookies (accessToken or auth-token)
    if (!email) {
      const accessToken =
        request.cookies.get("accessToken")?.value ||
        request.cookies.get("auth-token")?.value;

      if (accessToken) {
        try {
          const payload = await verifyAccessToken(accessToken);
          email = payload.email || null;
        } catch (e) {
          // ignore verification error here; we'll treat as unauthenticated below
        }
      }
    }

    if (!email) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        isTOTPEnabled: true,
        totpEnabledAt: true,
        lastTOTPUsedAt: true,
        failedTOTPAttempts: true,
        totpLockUntil: true,
        totpBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const remainingBackupCodes = user.isTOTPEnabled
      ? user.totpBackupCodes?.length || 0
      : 0;

    return NextResponse.json({
      authenticated: true,
      isTOTPEnabled: user.isTOTPEnabled,
      totpEnabledAt: user.totpEnabledAt,
      lastTOTPUsedAt: user.lastTOTPUsedAt,
      remainingBackupCodes,
      isLocked: Boolean(user.totpLockUntil && user.totpLockUntil > new Date()),
      failedAttempts: user.failedTOTPAttempts,
    });
  } catch (error) {
    console.error("TOTP status check error:", error);
    return NextResponse.json(
      { error: "Failed to get TOTP status" },
      { status: 500 }
    );
  }
}
