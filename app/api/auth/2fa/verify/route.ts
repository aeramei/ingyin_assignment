import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { verifyAccessToken } from "@/lib/auth";
import { TOTPService } from "@/lib/totp-service";
import { EncryptionService } from "@/lib/encryption";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger, redact } from "@/lib/logger";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const log = createRequestLogger("2fa/verify");
  try {
    const session = await getServerSession(authOptions);
    let email = session?.user?.email ?? null;

    if (!email) {
      const accessToken =
        request.cookies.get("accessToken")?.value ||
        request.cookies.get("auth-token")?.value;
      if (accessToken) {
        try {
          const payload = await verifyAccessToken(accessToken);
          email = (payload as any)?.email ?? null;
        } catch (_) {}
      }
    }

    if (!email) {
      const headerEmail = request.headers.get("x-user-email");
      if (headerEmail) email = headerEmail;
    }

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, encryptedSecret, encryptedBackupCodes } = await request.json();

    log.debug("Incoming verify payload", {
      tokenLen: token ? String(token).length : 0,
      hasEncryptedSecret: !!encryptedSecret,
      backupCodesCount: Array.isArray(encryptedBackupCodes) ? encryptedBackupCodes.length : 0,
    });

    if (!token || !encryptedSecret) {
      return NextResponse.json(
        { error: "Token and secret are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let secret: string;
    try {
      secret = EncryptionService.decrypt(
        encryptedSecret,
        process.env.TOTP_SECRET_ENCRYPTION_KEY!
      );
      log.debug("Decrypted temp secret successfully", { preview: redact(secret, 3, 3), len: secret.length });
    } catch (e: any) {
      log.warn("Failed to decrypt temp secret. Likely stale/legacy temp data; prompt re-setup.", { reason: String(e?.message || e) });
      return NextResponse.json(
        {
          error: "Your 2FA setup session expired or is invalid. Please restart the setup and try again.",
          code: "RETRY_SETUP",
        },
        { status: 400 }
      );
    }

    const isValid = TOTPService.verifyToken(token, secret);
    log.debug("TOTP verification result", { result: isValid });

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

    let finalEncryptedBackupCodes: string[] = [];
    try {
      finalEncryptedBackupCodes = (encryptedBackupCodes || []).map((code: string) =>
        EncryptionService.encrypt(
          EncryptionService.decrypt(
            code,
            process.env.BACKUP_CODES_ENCRYPTION_KEY!
          ),
          process.env.BACKUP_CODES_ENCRYPTION_KEY!
        )
      );
    } catch (e: any) {
      log.warn("Failed to process backup codes; proceeding without them", { reason: String(e?.message || e) });
      finalEncryptedBackupCodes = [];
    }

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
