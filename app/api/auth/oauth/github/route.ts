import { NextRequest, NextResponse } from "next/server";
import { generateGitHubOAuthUrl } from "@/lib/oauth";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    // Generate state parameter for security
    const state = uuidv4();

    // Generate GitHub OAuth URL
    const authUrl = generateGitHubOAuthUrl(state);

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

    return response;
  } catch (error) {
    console.error("GitHub OAuth initiation error:", error);
    return NextResponse.redirect(
      new URL("/signin?error=oauth_failed", request.url)
    );
  }
}
