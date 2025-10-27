import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { verifyAccessToken } from "@/lib/auth";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger } from "@/lib/logger";
import { TOTPAuth } from "@/lib/totp-auth";

const prisma = new PrismaClient();

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

    if (useBackupCode) {
      isValid = await TOTPAuth.verifyBackupCode(user.id, token);
    } else {
      const result = await TOTPAuth.verifyTOTP(user.id, token);
      isValid = result.success;
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
          details: {
            reason: useBackupCode ? "Invalid backup code" : "Invalid TOTP token",
            failedAttempts: newFailedAttempts,
            isLocked: !!lockUntil,
          },
        },
      });

      const errorMessage = useBackupCode
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
        details: {
          method: useBackupCode ? "backup_code" : "totp_token",
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
              details: { error: String(error) },
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
