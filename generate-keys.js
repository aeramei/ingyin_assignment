const crypto = require("crypto");

function generateKey() {
  return crypto.randomBytes(32).toString("base64");
}

console.log("=== GENERATE ENCRYPTION KEYS ===");
console.log("");
console.log("TOTP_SECRET_ENCRYPTION_KEY:", generateKey());
console.log("BACKUP_CODES_ENCRYPTION_KEY:", generateKey());
console.log("");
