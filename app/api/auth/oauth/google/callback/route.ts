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
        const googleAccessToken = await exchangeGoogleCodeForToken(code);
        log.info("Provider token obtained", { token: redact(googleAccessToken) });

        // Get user profile from Google
        log.debug("Fetching provider user profile...");
        const userProfile = await getGoogleUserProfile(googleAccessToken);
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

        // If user has TOTP enabled, require authenticator code
        if (user.isTOTPEnabled) {
            const totpToken = await TokenService.generateTOTPVerificationToken(
                user.id,
                user.email,
                user.email,
                user.role,
                user.name || undefined
            );

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: "LOGIN_TOTP_REQUIRED",
                    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
                    userAgent: request.headers.get("user-agent") || "unknown",
                    details: { provider: "google", totpRequired: true },
                },
            });

            const verifyUrl = new URL("/verify-totp", request.url);
            const response = NextResponse.redirect(verifyUrl);
            response.cookies.set("totp_temp_token", totpToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 10 * 60,
                path: "/",
            });
            clearNextAuthCookies(response);
            response.cookies.delete("oauth_state");

            log.info("Redirecting to verify-totp (TOTP required)", { path: verifyUrl.pathname });
            return response;
        }

        // If TOTP is NOT enabled, send an email OTP as a fallback 2FA
        try {
            const otp = generateOTP();
            await storeOTP(user.id, otp);
            await sendOTPEmail(user.email, otp, user.name ?? "User");

            const otpToken = await TokenService.generateTOTPVerificationToken(
                user.id,
                user.email,
                user.email,
                user.role,
                user.name || undefined
            );

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: "LOGIN_OTP_REQUIRED",
                    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
                    userAgent: request.headers.get("user-agent") || "unknown",
                    details: { provider: "google", totpRequired: false, otpType: "email" },
                },
            });

            const verifyUrl = new URL("/verify-otp", request.url);
            const response = NextResponse.redirect(verifyUrl);
            response.cookies.set("otp_temp_token", otpToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 10 * 60, // 10 minutes
                path: "/",
            });
            clearNextAuthCookies(response);
            response.cookies.delete("oauth_state");

            log.info("Redirecting to verify-otp (Email OTP required)", { path: verifyUrl.pathname });
            return response;
        } catch (otpError: any) {
            log.error("OTP sending failed", { userId: user.id, error: otpError.message });
            return NextResponse.redirect(
                new URL("/signin?error=otp_send_failed", request.url)
            );
        }

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
