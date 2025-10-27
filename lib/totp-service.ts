// lib/totp-service.ts
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { EncryptionService } from "./encryption";
import { TOTP_CONFIG } from "./totp-config";
import { createRequestLogger, redact } from "./logger";

// Configure authenticator
authenticator.options = {
  window: TOTP_CONFIG.window,
  step: TOTP_CONFIG.period,
  digits: TOTP_CONFIG.digits,
};

function isBase32Secret(secret: string): boolean {
  // RFC 4648 Base32 alphabet without padding
  return /^[A-Z2-7]+=*$/i.test(secret.replace(/\s+/g, ""));
}

export class TOTPService {
  static generateSecret(): string {
    const log = createRequestLogger("totp-service/generateSecret");
    // Use otplib to generate a Base32 secret (preferred by authenticators)
    const secret = authenticator.generateSecret(TOTP_CONFIG.secretLength);
    const base32 = isBase32Secret(secret);
    log.info("Generated TOTP secret", {
      length: secret.length,
      looksBase32: base32,
      preview: redact(secret, 4, 4),
    });
    if (!base32) {
      log.warn("Secret may not be Base32 — many authenticators require Base32. Ensure generator matches authenticator expectations.");
    }
    return secret;
  }

  static async generateQRCode(secret: string, email: string): Promise<string> {
    const log = createRequestLogger("totp-service/generateQRCode");
    try {
      const label = email;
      const issuer = TOTP_CONFIG.issuer;
      const otpauth = authenticator.keyuri(label, issuer, secret);
      log.debug("Built otpauth URI", {
        label,
        issuer,
        uriPreview: otpauth.slice(0, 40) + "...",
        secretPreview: redact(secret, 4, 4),
        digits: TOTP_CONFIG.digits,
        period: TOTP_CONFIG.period,
        window: TOTP_CONFIG.window,
      });

      log.info("Generating QR code", { for: label });
      const qrCode = await QRCode.toDataURL(otpauth);
      log.info("QR Code generated successfully", { size: qrCode.length });

      return qrCode;
    } catch (error: any) {
      log.error("QR Code generation failed", { error: String(error?.message || error) });
      // Fallback: Create a simple SVG QR code
      return this.createFallbackQRCode(secret);
    }
  }

  private static createFallbackQRCode(secret: string): string {
    const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <rect x="20" y="20" width="160" height="160" fill="white" stroke="#dee2e6" stroke-width="2"/>
        <text x="100" y="80" text-anchor="middle" font-family="Arial" font-size="12" fill="#495057">
          Scan with Authenticator
        </text>
        <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="10" fill="#6c757d">
          Manual entry:
        </text>
        <text x="100" y="115" text-anchor="middle" font-family="Monaco, monospace" font-size="8" fill="#495057">
          ${secret.substring(0, 16)}
        </text>
        <text x="100" y="125" text-anchor="middle" font-family="Monaco, monospace" font-size="8" fill="#495057">
          ${secret.substring(16, 32)}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  static verifyToken(token: string, secret: string): boolean {
    const log = createRequestLogger("totp-service/verifyToken");
    try {
      const cleanToken = token.replace(/\s+/g, "");
      const result = authenticator.verify({ token: cleanToken, secret });
      log.debug("TOTP verification attempted", {
        tokenLength: cleanToken.length,
        secretPreview: redact(secret, 4, 4),
        result,
      });
      return result;
    } catch (error: any) {
      log.error("Token verification error", { error: String(error?.message || error) });
      return false;
    }
  }

  static generateBackupCodes(): string[] {
    const log = createRequestLogger("totp-service/generateBackupCodes");
    const codes: string[] = [];
    for (let i = 0; i < TOTP_CONFIG.backupCodeCount; i++) {
      codes.push(EncryptionService.generateBackupCode());
    }
    log.info("Generated backup codes", { count: codes.length });
    return codes;
  }
}
