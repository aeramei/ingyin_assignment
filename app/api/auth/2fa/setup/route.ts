import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options"; // Use shared auth options
import { verifyAccessToken } from "@/lib/auth"; // Fallback to JWT cookies
import { TOTPService } from "@/lib/totp-service";
import { EncryptionService } from "@/lib/encryption";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger, redact } from "@/lib/logger";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const log = createRequestLogger("2fa/setup");
  try {
    log.info("TOTP Setup API called");

    // Try NextAuth session
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email ?? null;

    // Fallback 1: JWT cookies (accessToken or auth-token)
    if (!userEmail) {
      const accessToken =
        request.cookies.get("accessToken")?.value ||
        request.cookies.get("auth-token")?.value;
      if (accessToken) {
        try {
          const payload = await verifyAccessToken(accessToken);
          userEmail = (payload as any)?.email ?? null;
        } catch (e) {
          // ignore
        }
      }
    }

    // Fallback 2: Middleware-injected header
    if (!userEmail) {
      const headerEmail = request.headers.get("x-user-email");
      if (headerEmail) userEmail = headerEmail;
    }

    log.debug("Session debug", {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!userEmail,
      email: userEmail || undefined,
    });

    if (!userEmail) {
      log.warn("No session found - user not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() },
      select: { id: true, email: true, isTOTPEnabled: true },
    });

    if (!user) {
      log.warn("User not found in database", { email: userEmail });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    log.info("User fetched", { id: user.id, email: user.email, isTOTPEnabled: user.isTOTPEnabled });

    if (user.isTOTPEnabled) {
      log.warn("TOTP already enabled for user", { userId: user.id });
      return NextResponse.json(
        { error: "TOTP is already enabled" },
        { status: 400 }
      );
    }

    // Check env keys presence (do not log actual values)
    const hasSecretKey = !!process.env.TOTP_SECRET_ENCRYPTION_KEY;
    const hasBackupKey = !!process.env.BACKUP_CODES_ENCRYPTION_KEY;
    if (!hasSecretKey || !hasBackupKey) {
      log.error("Missing encryption keys", { hasSecretKey, hasBackupKey });
    } else {
      log.debug("Encryption keys present");
    }

    // Generate TOTP secret
    const secret = TOTPService.generateSecret();
    log.info("Generated secret", { length: secret.length, preview: redact(secret, 4, 4) });

    // Generate QR code
    const qrCodeUrl = await TOTPService.generateQRCode(secret, user.email);
    log.info("QR Code URL generated", { dataUrlLength: qrCodeUrl.length });

    // Generate backup codes
    const backupCodes = TOTPService.generateBackupCodes();
    log.info("Backup codes generated", { count: backupCodes.length });

    // Encrypt data
    const encryptedSecret = EncryptionService.encrypt(
      secret,
      process.env.TOTP_SECRET_ENCRYPTION_KEY!
    );

    const encryptedBackupCodes = backupCodes.map((code) =>
      EncryptionService.encrypt(code, process.env.BACKUP_CODES_ENCRYPTION_KEY!)
    );

    log.debug("Returning TOTP setup data", {
      encryptedSecretPreview: redact(encryptedSecret, 6, 6),
      encryptedBackupCodesCount: encryptedBackupCodes.length,
    });

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      secret,
      backupCodes,
      tempData: {
        encryptedSecret,
        encryptedBackupCodes,
      },
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup TOTP" },
      { status: 500 }
    );
  }
}
