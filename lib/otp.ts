// lib/otp.ts - USING GLOBAL VARIABLE
// This works in some serverless environments

// Use globalThis to make it persistent across function invocations
declare global {
  var otpStore: Map<string, { otp: string; expiresAt: number }> | undefined;
}

function getOtpStore() {
  if (!globalThis.otpStore) {
    globalThis.otpStore = new Map<string, { otp: string; expiresAt: number }>();
    console.log("🔄 Created new global OTP store");
  }
  return globalThis.otpStore;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function storeOTP(email: string, otp: string): Promise<void> {
  const store = getOtpStore();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  store.set(email, {
    otp,
    expiresAt,
  });
  console.log(
    `🔐 OTP stored for ${email}: ${otp}, expires at: ${new Date(
      expiresAt
    ).toISOString()}`
  );
  console.log(`📊 Current store size: ${store.size}`);
  console.log(`📋 Store contents:`, Array.from(store.entries()));
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const store = getOtpStore();
  const stored = store.get(email);

  console.log(`🔍 OTP Verification Check:`);
  console.log(`   - Email: ${email}`);
  console.log(`   - Provided OTP: ${otp}`);
  console.log(`   - Stored OTP: ${stored?.otp || "NOT FOUND"}`);
  console.log(`   - Current time: ${new Date().toISOString()}`);
  console.log(
    `   - Expires at: ${
      stored ? new Date(stored.expiresAt).toISOString() : "N/A"
    }`
  );
  console.log(`   - Store size: ${store.size}`);
  console.log(`   - Store contents:`, Array.from(store.entries()));

  if (!stored) {
    console.log("❌ OTP not found for email");
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    console.log("❌ OTP expired");
    store.delete(email);
    return false;
  }

  if (stored.otp !== otp) {
    console.log("❌ OTP mismatch");
    return false;
  }

  console.log("✅ OTP verified successfully");
  store.delete(email);
  return true;
}

export function cleanupExpiredOTPs(): void {
  const store = getOtpStore();
  const now = Date.now();
  let cleaned = 0;

  for (const [email, data] of store.entries()) {
    if (now > data.expiresAt) {
      store.delete(email);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired OTPs`);
  }
}

setInterval(cleanupExpiredOTPs, 60 * 60 * 1000);
