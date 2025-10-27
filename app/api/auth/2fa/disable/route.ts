import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { verifyAccessToken } from "@/lib/auth";
import { PrismaClient } from "@/app/generated/prisma";
import { authenticator } from "otplib";
import { createRequestLogger } from "@/lib/logger";

const prisma = new PrismaClient();

// Configure TOTP (you can move this to a separate config file)
authenticator.options = {
  window: 1, // Allow 1 step before/after current time
  step: 30, // 30-second steps
};

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitStore.delete(key);
    }
  }

  const userLimit = rateLimitStore.get(identifier) || {
    count: 0,
    resetTime: now + windowMs,
  };

  if (userLimit.resetTime < now) {
    // Reset counter if window has passed
    userLimit.count = 0;
    userLimit.resetTime = now + windowMs;
  }

  if (userLimit.count >= limit) {
    return false; // Rate limited
  }

  userLimit.count++;
  rateLimitStore.set(identifier, userLimit);
  return true;
}

// TOTP verification function
async function verifyTOTPToken(
  secret: string | null,
  token: string
): Promise<boolean> {
  if (!secret) return false;

  try {
    // Clean the token (remove spaces)
    const cleanToken = token.replace(/\s/g, "");

    // Verify the token
    return authenticator.verify({
      token: cleanToken,
      secret: secret,
    });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
}

// Backup code verification
function verifyBackupCode(backupCodes: string[], code: string): boolean {
  if (!backupCodes || !Array.isArray(backupCodes)) return false;

  const cleanCode = code.replace(/\s/g, "").toLowerCase();
  const index = backupCodes.findIndex(
    (backupCode) => backupCode.replace(/\s/g, "").toLowerCase() === cleanCode
  );

  return index !== -1;
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger("2fa/disable");
  try {
    const session = await getServerSession(authOptions);
    let email = session?.user?.email ?? null;

    // Fallback 1: JWT cookies (accessToken or auth-token)
    if (!email) {
      const accessToken =
        request.cookies.get("accessToken")?.value ||
        request.cookies.get("auth-token")?.value;
      if (accessToken) {
        try {
          const payload = await verifyAccessToken(accessToken);
          email = (payload as any)?.email ?? null;
        } catch (_) {}
      }
    }

    // Fallback 2: Middleware header
    if (!email) {
      const headerEmail = request.headers.get("x-user-email");
      if (headerEmail) email = headerEmail;
    }

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, useBackupCode } = await request.json();

    // Validate input
    if (!token) {
      return NextResponse.json(
        { error: "Verification token or backup code required" },
        { status: 400 }
      );
    }

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitKey = `disable_2fa_${email}_${ip}`;

    if (!checkRateLimit(rateLimitKey, 5, 60000)) {
      // 5 attempts per minute
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a minute." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        isTOTPEnabled: true,
        totpSecret: true,
        totpBackupCodes: true,
        failedTOTPAttempts: true,
        totpLockUntil: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if TOTP is already disabled
    if (!user.isTOTPEnabled) {
      return NextResponse.json(
        { error: "TOTP is not enabled" },
        { status: 400 }
      );
    }

    // Check if account is locked due to too many failed attempts
    if (user.totpLockUntil && user.totpLockUntil > new Date()) {
      return NextResponse.json(
        { error: "Account temporarily locked due to too many failed attempts" },
        { status: 423 }
      );
    }

    let isValid = false;
    let isBackupCode = false;

    // Verify token - either TOTP token or backup code
    if (useBackupCode) {
      // Verify backup code
      isValid = verifyBackupCode(user.totpBackupCodes as string[], token);
      isBackupCode = true;
    } else {
      // Verify TOTP token
      isValid = await verifyTOTPToken(user.totpSecret, token);
    }

    if (!isValid) {
      // Increment failed attempts
      const newFailedAttempts = (user.failedTOTPAttempts || 0) + 1;
      let lockUntil = null;

      // Lock account after 5 failed attempts for 15 minutes
      if (newFailedAttempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedTOTPAttempts: newFailedAttempts,
          totpLockUntil: lockUntil,
        },
      });

      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "TOTP_DISABLE_FAILED",
          ipAddress: request.headers.get("x-forwarded-for") || ip,
          userAgent: request.headers.get("user-agent") || "unknown",
          metadata: {
            reason: isBackupCode ? "Invalid backup code" : "Invalid TOTP token",
            failedAttempts: newFailedAttempts,
            isLocked: !!lockUntil,
          },
        },
      });

      const errorMessage = isBackupCode
        ? "Invalid backup code"
        : "Invalid verification token";

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Reset failed attempts on successful verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpSecret: null,
        totpBackupCodes: [],
        isTOTPEnabled: false,
        failedTOTPAttempts: 0,
        totpLockUntil: null,
      },
    });

    // Log successful disable
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "TOTP_DISABLED",
        ipAddress: request.headers.get("x-forwarded-for") || ip,
        userAgent: request.headers.get("user-agent") || "unknown",
        metadata: {
          method: isBackupCode ? "backup_code" : "totp_token",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Two-factor authentication disabled successfully",
    });
  } catch (error) {
    console.error("TOTP disable error:", error);

    // Log the error
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        });

        if (user) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "TOTP_DISABLE_ERROR",
              ipAddress: request.headers.get("x-forwarded-for") || "unknown",
              userAgent: request.headers.get("user-agent") || "unknown",
              metadata: { error: String(error) },
            },
          });
        }
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return NextResponse.json(
      { error: "Failed to disable two-factor authentication" },
      { status: 500 }
    );
  }
}
