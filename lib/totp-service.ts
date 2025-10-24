// lib/totp-service.ts
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { EncryptionService } from "./encryption";
import { TOTP_CONFIG } from "./totp-config";

// Configure authenticator
authenticator.options = {
  window: TOTP_CONFIG.window,
  step: TOTP_CONFIG.period,
  digits: TOTP_CONFIG.digits,
};

export class TOTPService {
  static generateSecret(): string {
    return EncryptionService.generateTOTPSecret();
  }

  static async generateQRCode(secret: string, email: string): Promise<string> {
    try {
      const otpauth = authenticator.keyuri(email, TOTP_CONFIG.issuer, secret);
      console.log("Generating QR code for:", email);

      const qrCode = await QRCode.toDataURL(otpauth);
      console.log("QR Code generated successfully");

      return qrCode;
    } catch (error) {
      console.error("QR Code generation failed:", error);
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
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      console.error("Token verification error:", error);
      return false;
    }
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < TOTP_CONFIG.backupCodeCount; i++) {
      codes.push(EncryptionService.generateBackupCode());
    }
    return codes;
  }
}
