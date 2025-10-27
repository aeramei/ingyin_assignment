import * as CryptoJS from 'crypto-js';
import { createRequestLogger, redact } from '@/lib/logger';

export class EncryptionService {
    private static deriveKey(key: string): CryptoJS.lib.WordArray {
        // Deterministically derive a 256-bit key from the provided env secret (no Node crypto)
        return CryptoJS.SHA256(key);
    }

    static encrypt(text: string, key: string): string {
        const log = createRequestLogger('encryption/encrypt');
        try {
            if (!key) {
                throw new Error('Missing encryption key');
            }

            // Derive a 256-bit key from the env secret
            const derivedKey = this.deriveKey(key);

            // Generate a random 16-byte IV
            const iv = CryptoJS.lib.WordArray.random(16);

            // Encrypt using key mode (not passphrase mode)
            const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(text), derivedKey, {
                iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });

            const out = `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.ciphertext.toString(CryptoJS.enc.Hex)}`;
            // Debug without leaking plaintext
            log.debug('Encrypted payload', { ivLen: 16, cipherHexLen: encrypted.ciphertext.toString(CryptoJS.enc.Hex).length });
            return out;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Encryption failed');
        }
    }

    static decrypt(encryptedText: string, key: string): string {
        const log = createRequestLogger('encryption/decrypt');
        try {
            if (!key) {
                throw new Error('Missing encryption key');
            }

            const parts = String(encryptedText).split(':');
            if (parts.length !== 2 || !parts[0] || !parts[1]) {
                throw new Error('INVALID_FORMAT');
            }

            // Parse the IV and the encrypted data from hex
            const iv = CryptoJS.enc.Hex.parse(parts[0]);
            const ciphertextHex = parts[1];

            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Hex.parse(ciphertextHex),
            });

            const derivedKey = this.deriveKey(key);

            const decrypted = CryptoJS.AES.decrypt(cipherParams, derivedKey, {
                iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7,
            });

            const decryptedText = CryptoJS.enc.Utf8.stringify(decrypted);
            if (!decryptedText) {
                throw new Error('INVALID_KEY_OR_DATA');
            }

            log.debug('Decryption successful', { size: decrypted.sigBytes });
            return decryptedText;
        } catch (error: any) {
            // Map internal errors to a stable message used by callers
            console.error('Decryption error:', error);
            if (error?.message === 'INVALID_FORMAT') {
                throw new Error('Decryption failed: invalid payload format');
            }
            throw new Error('Decryption failed. (Check key or data format)');
        }
    }

    // DEPRECATED: Use otplib's authenticator.generateSecret() to get Base32 secrets.
    static generateTOTPSecret(): string {
        // Kept for backward-compat/misc but not used for TOTP anymore (was Base64).
        return CryptoJS.lib.WordArray.random(20).toString(CryptoJS.enc.Base64);
    }

    static generateBackupCode(): string {
        // This function doesn't use 'crypto' so it can remain the same.
        return Math.random().toString(36).substring(2, 12).toUpperCase();
    }
}
