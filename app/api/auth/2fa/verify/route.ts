import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
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

    const { token, encryptedSecret, encryptedBackupCodes } =
      await request.json();

    if (!token || !encryptedSecret) {
      return NextResponse.json(
        { error: "Token and secret are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const secret = EncryptionService.decrypt(
      encryptedSecret,
      process.env.TOTP_SECRET_ENCRYPTION_KEY!
    );

    const isValid = TOTPService.verifyToken(token, secret);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid TOTP token" },
        { status: 400 }
      );
    }

    const finalEncryptedSecret = EncryptionService.encrypt(
      secret,
      process.env.TOTP_SECRET_ENCRYPTION_KEY!
    );

    const finalEncryptedBackupCodes = encryptedBackupCodes.map((code: string) =>
      EncryptionService.encrypt(
        EncryptionService.decrypt(
          code,
          process.env.BACKUP_CODES_ENCRYPTION_KEY!
        ),
        process.env.BACKUP_CODES_ENCRYPTION_KEY!
      )
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: finalEncryptedSecret,
        totpBackupCodes: finalEncryptedBackupCodes,
        isTOTPEnabled: true,
        totpEnabledAt: new Date(),
        failedTOTPAttempts: 0,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TOTP_ENABLED",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({
      success: true,
      message: "TOTP enabled successfully",
    });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return NextResponse.json(
      { error: "Failed to enable TOTP" },
      { status: 500 }
    );
  }
}
