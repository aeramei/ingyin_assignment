import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForToken, getGoogleUserProfile, googleOAuthConfig } from "@/lib/oauth";
import { PrismaClient } from "@/app/generated/prisma";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/gmail";
import { TokenService } from "@/lib/jwt";
import { createRequestLogger, redact } from "@/lib/logger";
import {clearNextAuthCookies, setPreAuthAccessCookie} from "@/lib/cookies";

export async function GET(request: NextRequest) {
  let prisma;
  const log = createRequestLogger("oauth/google/callback");
  const start = Date.now();

  try {
    prisma = new PrismaClient();

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    log.info("Incoming Google OAuth callback", {
      hasCode: Boolean(code),
      hasState: Boolean(state),
      error: error || undefined,
      redirectUriPath: new URL(googleOAuthConfig.redirectUri).pathname,
    });

    // Check for OAuth errors
    if (error) {
      log.warn("Provider returned error", { error });
      return NextResponse.redirect(
        new URL(`/signin?error=oauth_${error}`, request.url)
      );
    }

    // Validate state parameter
    const storedState = request.cookies.get("oauth_state")?.value;
    if (!state || state !== storedState) {
      log.warn("Invalid state parameter", { state: state ? state.slice(0, 6) + "***" : null, stored: storedState ? storedState.slice(0,6)+"***" : null });
      return NextResponse.redirect(
        new URL("/signin?error=invalid_state", request.url)
      );
    }

    if (!code) {
      log.warn("Missing authorization code");
      return NextResponse.redirect(
        new URL("/signin?error=no_code", request.url)
      );
    }

    log.debug("Exchanging code for provider token...");

    // Exchange code for access token
    const accessToken = await exchangeGoogleCodeForToken(code);
    log.info("Provider token obtained", { token: redact(accessToken) });

    // Get user profile from Google
    log.debug("Fetching provider user profile...");
    const userProfile = await getGoogleUserProfile(accessToken);
    log.info("Provider profile fetched", { emailDomain: (userProfile.email || "").split("@")[1] || null, idPrefix: userProfile.id?.slice(0,6) });

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: userProfile.email },
    });
    log.debug("User lookup complete", { exists: Boolean(user) });

    // Create new user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userProfile.email,
          name: userProfile.name,
          password: "OAUTH_USER",
          company: "Not specified",
          plan: "starter",
          role: "USER",
          status: "ACTIVE",
          avatar: userProfile.picture,
          authProvider: "GOOGLE",
          authProviderId: userProfile.id,
        },
      });
      log.info("Created new OAuth user", { userId: user.id });
    }

    // Check if user is active
    if (user.status !== "ACTIVE") {
      log.warn("Account inactive", { userId: user.id, status: user.status });
      return NextResponse.redirect(
        new URL("/signin?error=account_inactive", request.url)
      );
    }

    // Always require OTP after OAuth (Google)
    const otp = generateOTP();
    await storeOTP(user.email, otp);
    log.debug("OTP generated and stored");

    // Send OTP via email
    const sent = await sendOTPEmail(user.email, otp, user.name || "User");
    if (!sent) {
      log.error("Failed to send OTP email");
      return NextResponse.redirect(new URL("/signin?error=send_failed", request.url));
    }
    log.info("OTP email sent");

    // Issue short-lived pre-auth access token: requires OTP
    const preAuthPayload = {
      userId: user.id,
      username: user.email,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      isTOTPEnabled: user.isTOTPEnabled,
      otpRequired: true,
      otpVerified: false,
    } as const;

    const preAuthAccessToken = await TokenService.generateAccessToken(preAuthPayload as any);
    log.debug("Pre-auth access token minted");

    // Audit log (OTP sent for OAuth login)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_OTP_SENT",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        details: { provider: "google", ttlMinutes: 10 },
      },
    });
    log.debug("Audit log recorded");

    // Redirect to verify-otp with prefilled params
    const verifyUrl = new URL("/verify-otp", request.url);
    verifyUrl.searchParams.set("email", user.email);
    if (user.name) verifyUrl.searchParams.set("name", user.name);

    const response = NextResponse.redirect(verifyUrl);
    setPreAuthAccessCookie(response, preAuthAccessToken);
    clearNextAuthCookies(response);
    response.cookies.delete("oauth_state");

    log.info("Redirecting to verify-otp", { path: verifyUrl.pathname, query: verifyUrl.search });
    return response;
  } catch (error: any) {
    log.error("Google OAuth callback error", { error: String(error) });

    let errorType = "oauth_failed";
    if (error.message?.includes?.("timeout")) {
      errorType = "oauth_timeout";
    } else if (error.message?.includes?.("network")) {
      errorType = "oauth_network";
    } else if (error.message?.includes?.("invalid_grant")) {
      errorType = "oauth_invalid_code";
    }

    const response = NextResponse.redirect(
      new URL(`/signin?error=${errorType}`, request.url)
    );

    response.cookies.delete("oauth_state");
    response.cookies.delete("totp_temp_token");

    return response;
  } finally {
    const ms = Date.now() - start;
    log.info("Callback finished", { durationMs: ms });
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}
