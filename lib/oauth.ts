// OAuth utility functions for social login

export interface OAuthUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Google OAuth configuration
export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
  redirectUri:
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    "http://localhost:3000/api/auth/oauth/google/callback",
  scopes: ["openid", "profile", "email"],
};

// GitHub OAuth configuration
export const githubOAuthConfig = {
  clientId: process.env.GITHUB_OAUTH_CLIENT_ID!,
  clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
  authUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  userInfoUrl: "https://api.github.com/user",
  userEmailsUrl: "https://api.github.com/user/emails",
  redirectUri:
    process.env.GITHUB_OAUTH_REDIRECT_URI ||
    "http://localhost:3000/api/auth/oauth/github/callback",
  scopes: ["user:email"],
};

// Generate Google OAuth URL
export function generateGoogleOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: googleOAuthConfig.clientId,
    redirect_uri: googleOAuthConfig.redirectUri,
    response_type: "code",
    scope: googleOAuthConfig.scopes.join(" "),
    state: state,
    access_type: "offline",
    prompt: "consent",
  });

  return `${googleOAuthConfig.authUrl}?${params.toString()}`;
}

// Generate GitHub OAuth URL
export function generateGitHubOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: githubOAuthConfig.clientId,
    redirect_uri: githubOAuthConfig.redirectUri,
    scope: githubOAuthConfig.scopes.join(" "),
    state: state,
  });

  return `${githubOAuthConfig.authUrl}?${params.toString()}`;
}

// Exchange authorization code for access token (Google)
export async function exchangeGoogleCodeForToken(
  code: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds

  try {
    const response = await fetch(googleOAuthConfig.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: googleOAuthConfig.clientId,
        client_secret: googleOAuthConfig.clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: googleOAuthConfig.redirectUri,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google OAuth token exchange failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Google token exchange failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error(
        "Google OAuth timeout: Could not connect to Google servers"
      );
    }
    console.error("Google OAuth network error:", error);
    throw new Error("Network error during Google OAuth");
  }
}

// Exchange authorization code for access token (GitHub)
export async function exchangeGitHubCodeForToken(
  code: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds

  try {
    const response = await fetch(githubOAuthConfig.tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: githubOAuthConfig.clientId,
        client_secret: githubOAuthConfig.clientSecret,
        code: code,
        redirect_uri: githubOAuthConfig.redirectUri,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GitHub OAuth token exchange failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `GitHub token exchange failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.access_token;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error(
        "GitHub OAuth timeout: Could not connect to GitHub servers"
      );
    }
    console.error("GitHub OAuth network error:", error);
    throw new Error("Network error during GitHub OAuth");
  }
}

// Get user profile from Google
export async function getGoogleUserProfile(
  accessToken: string
): Promise<OAuthUserProfile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds

  try {
    const response = await fetch(googleOAuthConfig.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Google user profile: ${response.status} ${response.statusText}`
      );
    }

    const userInfo = await response.json();

    return {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("Google profile fetch timeout");
    }
    console.error("Google profile fetch error:", error);
    throw new Error("Failed to fetch Google user profile");
  }
}

// Get user profile from GitHub
export async function getGitHubUserProfile(
  accessToken: string
): Promise<OAuthUserProfile> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds

  try {
    // Get basic user info
    const userResponse = await fetch(githubOAuthConfig.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "SyncTech-App",
        Accept: "application/vnd.github.v3+json",
      },
      signal: controller.signal,
    });

    if (!userResponse.ok) {
      throw new Error(
        `Failed to fetch GitHub user profile: ${userResponse.status} ${userResponse.statusText}`
      );
    }

    const userInfo = await userResponse.json();

    // Get user emails (GitHub doesn't always return email in basic profile)
    const emailsResponse = await fetch(githubOAuthConfig.userEmailsUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "SyncTech-App",
        Accept: "application/vnd.github.v3+json",
      },
      signal: controller.signal,
    });

    let email = userInfo.email;

    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      const primaryEmail = emails.find((e: any) => e.primary && e.verified);
      if (primaryEmail) {
        email = primaryEmail.email;
      } else if (emails.length > 0) {
        email = emails[0].email;
      }
    }

    // If no email found, use a placeholder
    if (!email) {
      email = `${userInfo.login}@users.noreply.github.com`;
    }

    clearTimeout(timeout);

    return {
      id: userInfo.id.toString(),
      email: email,
      name: userInfo.name || userInfo.login,
      picture: userInfo.avatar_url,
    };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("GitHub profile fetch timeout");
    }
    console.error("GitHub profile fetch error:", error);
    throw new Error("Failed to fetch GitHub user profile");
  }
}
