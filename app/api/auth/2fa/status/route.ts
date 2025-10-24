import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        isTOTPEnabled: true,
        totpEnabledAt: true,
        lastTOTPUsedAt: true,
        failedTOTPAttempts: true,
        totpLockUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const remainingBackupCodes = user.isTOTPEnabled
      ? await prisma.user
          .findUnique({
            where: { id: user.id },
            select: { totpBackupCodes: true },
          })
          .then((u) => u?.totpBackupCodes?.length || 0)
      : 0;

    return NextResponse.json({
      isTOTPEnabled: user.isTOTPEnabled,
      totpEnabledAt: user.totpEnabledAt,
      lastTOTPUsedAt: user.lastTOTPUsedAt,
      remainingBackupCodes,
      isLocked: user.totpLockUntil && user.totpLockUntil > new Date(),
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
