import { TOTPService } from "./totp-service";
import { EncryptionService } from "./encryption";
import { TOTP_CONFIG } from "./totp-config";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export class TOTPAuth {
  static async verifyTOTP(
    userId: string,
    token: string
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          totpSecret: true,
          isTOTPEnabled: true,
          failedTOTPAttempts: true,
          totpLockUntil: true,
        },
      });

      if (!user || !user.isTOTPEnabled || !user.totpSecret) {
        return { success: false, reason: "TOTP not enabled" };
      }

      // Check if account is locked
      if (user.totpLockUntil && user.totpLockUntil > new Date()) {
        return {
          success: false,
          reason: "TOTP verification locked due to too many failed attempts",
        };
      }

      // Decrypt secret
      const secret = EncryptionService.decrypt(
        user.totpSecret,
        process.env.TOTP_SECRET_ENCRYPTION_KEY!
      );

      // Verify token
      const isValid = TOTPService.verifyToken(token, secret);

      if (isValid) {
        // Reset failed attempts on success
        await prisma.user.update({
          where: { id: userId },
          data: {
            failedTOTPAttempts: 0,
            lastTOTPUsedAt: new Date(),
            totpLockUntil: null,
          },
        });
        return { success: true };
      } else {
        // Increment failed attempts
        const newFailedAttempts = (user.failedTOTPAttempts || 0) + 1;

        let updateData: any = {
          failedTOTPAttempts: newFailedAttempts,
        };

        // Lock account if max attempts reached
        if (newFailedAttempts >= TOTP_CONFIG.maxFailedAttempts) {
          updateData.totpLockUntil = new Date(
            Date.now() + TOTP_CONFIG.lockoutDuration
          );
        }

        await prisma.user.update({
          where: { id: userId },
          data: updateData,
        });

        return {
          success: false,
          reason:
            newFailedAttempts >= TOTP_CONFIG.maxFailedAttempts
              ? "Account temporarily locked due to too many failed attempts"
              : "Invalid TOTP code",
        };
      }
    } catch (error) {
      console.error("TOTP verification error:", error);
      return { success: false, reason: "TOTP verification failed" };
    }
  }

  static async verifyBackupCode(
    userId: string,
    backupCode: string
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totpBackupCodes: true },
      });

      if (!user?.totpBackupCodes) return false;

      // Check each backup code
      for (const encryptedCode of user.totpBackupCodes) {
        try {
          const decryptedCode = EncryptionService.decrypt(
            encryptedCode,
            process.env.BACKUP_CODES_ENCRYPTION_KEY!
          );

          if (decryptedCode === backupCode) {
            // Remove used backup code
            const updatedCodes = user.totpBackupCodes.filter(
              (code) => code !== encryptedCode
            );
            await prisma.user.update({
              where: { id: userId },
              data: { totpBackupCodes: updatedCodes },
            });

            return true;
          }
        } catch (error) {
          continue; // Skip invalid encrypted codes
        }
      }

      return false;
    } catch (error) {
      console.error("Backup code verification error:", error);
      return false;
    }
  }
}
