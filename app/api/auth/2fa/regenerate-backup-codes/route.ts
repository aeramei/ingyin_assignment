import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { TOTPService } from "@/lib/totp-service";
import { EncryptionService } from "@/lib/encryption";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || !user.isTOTPEnabled) {
      return NextResponse.json(
        { error: "TOTP is not enabled" },
        { status: 400 }
      );
    }

    const newBackupCodes = TOTPService.generateBackupCodes();
    const encryptedBackupCodes = newBackupCodes.map((code) =>
      EncryptionService.encrypt(code, process.env.BACKUP_CODES_ENCRYPTION_KEY!)
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpBackupCodes: encryptedBackupCodes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "BACKUP_CODES_REGENERATED",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      backupCodes: newBackupCodes,
      message: "Backup codes regenerated successfully",
    });
  } catch (error) {
    console.error("Backup codes regeneration error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate backup codes" },
      { status: 500 }
    );
  }
}
