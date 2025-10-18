// lib/otp.ts - FIXED VERSION
let otpStore: Map<string, { otp: string; expiresAt: number }>;

function getOtpStore() {
  if (!otpStore) {
    otpStore = new Map<string, { otp: string; expiresAt: number }>();
  }
  return otpStore;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ✅ FIX: Remove the unused 'name' parameter
export async function storeOTP(email: string, otp: string): Promise<void> {
  const store = getOtpStore();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  store.set(email, {
    otp,
    expiresAt,
  });
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const store = getOtpStore();
  const stored = store.get(email);

  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    store.delete(email);
    return false;
  }

  if (stored.otp !== otp) {
    return false;
  }

  store.delete(email);
  return true;
}

export function cleanupExpiredOTPs(): void {
  const store = getOtpStore();
  const now = Date.now();
  for (const [email, data] of store.entries()) {
    if (now > data.expiresAt) {
      store.delete(email);
    }
  }
}

setInterval(cleanupExpiredOTPs, 60 * 60 * 1000);
