import { NextRequest, NextResponse } from "next/server";
import { generateGoogleOAuthUrl, googleOAuthConfig } from "@/lib/oauth";
import { v4 as uuidv4 } from "uuid";
import { createRequestLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const log = createRequestLogger("oauth/google/init");
  try {
    // Generate state parameter for security
    const state = uuidv4();
    log.debug("Starting Google OAuth initiation", { state: state.slice(0, 8) + "***" });

    // Generate Google OAuth URL
    const authUrl = generateGoogleOAuthUrl(state);
    const urlObj = new URL(authUrl);
    const cb = new URL(googleOAuthConfig.redirectUri);
    log.info("Generated Google auth URL", {
      authHost: urlObj.host,
      authPath: urlObj.pathname,
      redirectUriHost: cb.host,
      redirectUriPath: cb.pathname,
    });

    // Create response with redirect
    const response = NextResponse.redirect(authUrl);

    // Store state in http-only cookie for validation
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });
    log.debug("Set oauth_state cookie and redirecting to provider");

    return response;
  } catch (error) {
    log.error("Google OAuth initiation error", { error: String(error) });
    return NextResponse.redirect(
      new URL("/signin?error=oauth_failed", request.url)
    );
  }
}
