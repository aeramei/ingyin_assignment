import { NextRequest, NextResponse } from "next/server";
import { exchangeGitHubCodeForToken, getGitHubUserProfile } from "@/lib/oauth";
import { PrismaClient } from "@/app/generated/prisma";

export async function GET(request: NextRequest) {
  let prisma;

  try {
    prisma = new PrismaClient();

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      console.error("GitHub OAuth error:", error);
      return NextResponse.redirect(
        new URL("/signin?error=oauth_failed", request.url)
      );
    }

    // Validate state parameter
    const storedState = request.cookies.get("oauth_state")?.value;
    if (!state || state !== storedState) {
      console.error("Invalid state parameter");
      return NextResponse.redirect(
        new URL("/signin?error=invalid_state", request.url)
      );
    }

    if (!code) {
      console.error("No authorization code received");
      return NextResponse.redirect(
        new URL("/signin?error=no_code", request.url)
      );
    }

    // Exchange code for access token
    const accessToken = await exchangeGitHubCodeForToken(code);

    // Get user profile from GitHub
    const userProfile = await getGitHubUserProfile(accessToken);
    console.log("GitHub user profile:", userProfile);

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: userProfile.email },
    });

    // Create new user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userProfile.email,
          name: userProfile.name,
          password: "OAUTH_USER", // Special marker for OAuth users
          company: "Not specified",
          plan: "starter",
          role: "USER",
          status: "ACTIVE",
          avatar: userProfile.picture,
          authProvider: "GITHUB", // Track auth method
          authProviderId: userProfile.id, // GitHub user ID
        },
      });
      console.log("New GitHub OAuth user created:", user.id);
    }

    // Check if user is active
    if (user.status !== "ACTIVE") {
      return NextResponse.redirect(
        new URL("/signin?error=account_inactive", request.url)
      );
    }

    // Check if TOTP is enabled for this user
    if (user.isTOTPEnabled) {
      console.log("TOTP required for GitHub OAuth user:", user.id);

      // Generate TOTP verification token
      const { TokenService } = await import("@/lib/jwt");
      const totpToken = await TokenService.generateTOTPVerificationToken(
        user.id,
        user.email,
        user.email,
        user.role,
        user.name || undefined
      );

      // Redirect to TOTP verification
      const response = NextResponse.redirect(
        new URL(
          `/verify-totp?redirectTo=/authenticated&userId=${
            user.id
          }&totpToken=${encodeURIComponent(totpToken)}`,
          request.url
        )
      );

      // Clear OAuth state cookie
      response.cookies.delete("oauth_state");

      console.log("Redirecting GitHub OAuth user to TOTP verification");
      return response;
    }

    // Generate tokens using the new TokenService (No TOTP required)
    const { TokenService } = await import("@/lib/jwt");
    const jwtAccessToken = await TokenService.generateAccessToken(
      {
        userId: user.id,
        email: user.email,
        username: user.email,
        name: user.name || undefined,
        role: user.role,
        isTOTPEnabled: user.isTOTPEnabled,
      },
      false
    ); // totpVerified = false for OAuth

    const refreshToken = await TokenService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      username: user.email,
      name: user.name || undefined,
      role: user.role,
      isTOTPEnabled: user.isTOTPEnabled,
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN_GITHUB_OAUTH",
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        details: {
          provider: "github",
          providerId: userProfile.id,
          totpRequired: false,
        },
      },
    });

    // Create response with redirect to success page
    const response = NextResponse.redirect(
      new URL("/authenticated", request.url)
    );

    // Set HTTP-only cookies
    response.cookies.set("accessToken", jwtAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    // Clear OAuth state cookie
    response.cookies.delete("oauth_state");

    console.log("GitHub OAuth login successful for user:", user.id);
    return response;
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/signin?error=oauth_failed", request.url)
    );
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}
