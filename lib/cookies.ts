// lib/cookies.ts
// Centralized helpers for setting and clearing auth-related cookies
// Keep behavior aligned with existing routes in this project.

import { NextResponse } from "next/server";

export const COOKIE_NAMES = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  legacyAuth: "auth-token",
} as const;

const isProd = process.env.NODE_ENV === "production";

// Standard cookie options used across the project
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: "strict" as const,
  maxAge: 15 * 60, // 15 minutes
  path: "/",
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: "/",
};

/**
 * Sets both access and refresh token cookies using standardized options.
 * Mirrors cookie handling in verify-otp route.
 */
export function setAuthCookies(
  res: NextResponse,
  tokens: { accessToken: string; refreshToken: string }
) {
  res.cookies.set(COOKIE_NAMES.accessToken, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookies.set(COOKIE_NAMES.refreshToken, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
  // Clear legacy cookie if present
  res.cookies.delete(COOKIE_NAMES.legacyAuth);
}

/**
 * Sets a short-lived access token used during OTP pre-auth flows.
 * Matches options used in request-otp and OAuth callbacks.
 */
export function setPreAuthAccessCookie(res: NextResponse, accessToken: string) {
  res.cookies.set(COOKIE_NAMES.accessToken, accessToken, ACCESS_COOKIE_OPTIONS);
}

/**
 * Clears our auth cookies (access + refresh) and legacy cookie.
 */
export function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(COOKIE_NAMES.accessToken);
  res.cookies.delete(COOKIE_NAMES.refreshToken);
  res.cookies.delete(COOKIE_NAMES.legacyAuth);
}

/**
 * Clears known NextAuth-managed cookies to avoid confusion after OAuth.
 * Safe to call even if NextAuth is not actively used on a path.
 */
export function clearNextAuthCookies(res: NextResponse) {
  const names = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.pkce.code_verifier",
    "next-auth.state",
  ];
  for (const name of names) {
    res.cookies.delete(name);
  }
}
