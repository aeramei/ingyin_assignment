// lib/encryption.ts
import crypto from "crypto";

export class EncryptionService {
  static encrypt(text: string, key: string): string {
    try {
      const algorithm = "aes-256-cbc";
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Encryption failed");
    }
  }

  static decrypt(encryptedText: string, key: string): string {
    try {
      const algorithm = "aes-256-cbc";
      const parts = encryptedText.split(":");
      const iv = Buffer.from(parts[0], "hex");
      const encrypted = parts[1];

      const decipher = crypto.createDecipher(algorithm, key);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Decryption failed");
    }
  }

  static generateTOTPSecret(): string {
    return crypto.randomBytes(20).toString("base64");
  }

  static generateBackupCode(): string {
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  }
}
