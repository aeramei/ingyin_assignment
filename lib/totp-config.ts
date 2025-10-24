// lib/totp-config.ts
export const TOTP_CONFIG = {
  // TOTP Algorithm Settings
  secretLength: 32,
  window: 1,
  algorithm: "sha1",
  digits: 6,
  period: 30,

  // Security Settings
  backupCodeCount: 8,
  backupCodeLength: 10,
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes

  // Application Settings
  issuer: process.env.TOTP_ISSUER || "SyncTech",
  qrCodeSize: 200,
} as const;

// Encryption keys (store in env)
export const ENCRYPTION_CONFIG = {
  totpSecretKey: process.env.TOTP_SECRET_ENCRYPTION_KEY!, // 32-byte key
  backupCodesKey: process.env.BACKUP_CODES_ENCRYPTION_KEY!, // 32-byte key
} as const;

export const TOTP_RECOVERY_CONFIG = {
  maxBackupCodeUsage: 1, // Each backup code can be used once
  backupCodeExpiry: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
  requireTokenToDisable: true, // Security: require TOTP to disable TOTP
  requireTokenForBackupRegen: true, // Security: require TOTP to regenerate backups
} as const;
