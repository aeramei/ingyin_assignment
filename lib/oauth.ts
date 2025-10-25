// OAuth utility functions for social login
import { createRequestLogger, redact } from "@/lib/logger";

export interface OAuthUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Google OAuth configuration
export const googleOAuthConfig = {
  // Prefer standard env names; fall back to legacy *_OAUTH_* vars for compatibility
  clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
  redirectUri:
    process.env.GOOGLE_REDIRECT_URI ||
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    "http://localhost:3000/api/auth/oauth/google/callback",
  scopes: ["openid", "profile", "email"],
};

// GitHub OAuth configuration
export const githubOAuthConfig = {
  // Prefer standard env names; fall back to legacy *_OAUTH_* vars for compatibility
  clientId: process.env.GITHUB_CLIENT_ID || process.env.GITHUB_OAUTH_CLIENT_ID || "",
  clientSecret: process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_OAUTH_CLIENT_SECRET || "",
  authUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  userInfoUrl: "https://api.github.com/user",
  userEmailsUrl: "https://api.github.com/user/emails",
  redirectUri:
    process.env.GITHUB_REDIRECT_URI ||
    process.env.GITHUB_OAUTH_REDIRECT_URI ||
    "http://localhost:3000/api/auth/oauth/github/callback",
  scopes: ["user:email"],
};

// Generate Google OAuth URL
export function generateGoogleOAuthUrl(state: string): string {
  const log = createRequestLogger("oauth/google/url");
  const params = new URLSearchParams({
    client_id: googleOAuthConfig.clientId,
    redirect_uri: googleOAuthConfig.redirectUri,
    response_type: "code",
    scope: googleOAuthConfig.scopes.join(" "),
    state: state,
    access_type: "offline",
    prompt: "consent",
  });
  const url = `${googleOAuthConfig.authUrl}?${params.toString()}`;
  try {
    const cb = new URL(googleOAuthConfig.redirectUri);
    log.debug("Constructed Google OAuth URL", {
      authHost: new URL(googleOAuthConfig.authUrl).host,
      authPath: new URL(googleOAuthConfig.authUrl).pathname,
      redirectUriHost: cb.host,
      redirectUriPath: cb.pathname,
      statePreview: state.slice(0, 6) + "***",
    });
  } catch {}
  return url;
}

// Generate GitHub OAuth URL
export function generateGitHubOAuthUrl(state: string): string {
  const log = createRequestLogger("oauth/github/url");
  const params = new URLSearchParams({
    client_id: githubOAuthConfig.clientId,
    redirect_uri: githubOAuthConfig.redirectUri,
    scope: githubOAuthConfig.scopes.join(" "),
    state: state,
  });
  const url = `${githubOAuthConfig.authUrl}?${params.toString()}`;
  try {
    const cb = new URL(githubOAuthConfig.redirectUri);
    log.debug("Constructed GitHub OAuth URL", {
      authHost: new URL(githubOAuthConfig.authUrl).host,
      authPath: new URL(githubOAuthConfig.authUrl).pathname,
      redirectUriHost: cb.host,
      redirectUriPath: cb.pathname,
      statePreview: state.slice(0, 6) + "***",
    });
  } catch {}
  return url;
}

// Exchange authorization code for access token (Google)
export async function exchangeGoogleCodeForToken(
  code: string
): Promise<string> {
  const log = createRequestLogger("oauth/google/exchange");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds

  try {
    log.debug("Posting to Google token endpoint", {
      tokenUrlHost: new URL(googleOAuthConfig.tokenUrl).host,
      redirectUriPath: new URL(googleOAuthConfig.redirectUri).pathname,
      codePreview: code.slice(0, 4) + "***",
    });
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
      log.error("Google token exchange failed", {
        status: response.status,
        statusText: response.statusText,
        errorSnippet: errorText?.slice(0, 120),
      });
      throw new Error(
        `Google token exchange failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    log.debug("Google token exchange succeeded", { accessToken: redact(data.access_token) });
    return data.access_token;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error(
        "Google OAuth timeout: Could not connect to Google servers"
      );
    }
    log.error("Google OAuth network error", { error: String(error) });
    throw new Error("Network error during Google OAuth");
  }
}

// Exchange authorization code for access token (GitHub)
export async function exchangeGitHubCodeForToken(
  code: string
): Promise<string> {
  const log = createRequestLogger("oauth/github/exchange");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15 seconds

  try {
    log.debug("Posting to GitHub token endpoint", {
      tokenUrlHost: new URL(githubOAuthConfig.tokenUrl).host,
      redirectUriPath: new URL(githubOAuthConfig.redirectUri).pathname,
      codePreview: code.slice(0, 4) + "***",
    });
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
      log.error("GitHub token exchange failed", {
        status: response.status,
        statusText: response.statusText,
        errorSnippet: errorText?.slice(0, 120),
      });
      throw new Error(
        `GitHub token exchange failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    log.debug("GitHub token exchange succeeded", { accessToken: redact(data.access_token) });
    return data.access_token;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error(
        "GitHub OAuth timeout: Could not connect to GitHub servers"
      );
    }
    log.error("GitHub OAuth network error", { error: String(error) });
    throw new Error("Network error during GitHub OAuth");
  }
}

// Get user profile from Google
export async function getGoogleUserProfile(
  accessToken: string
): Promise<OAuthUserProfile> {
  const log = createRequestLogger("oauth/google/profile");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds

  try {
    log.debug("Fetching Google user info", { userInfoHost: new URL(googleOAuthConfig.userInfoUrl).host, token: redact(accessToken) });
    const response = await fetch(googleOAuthConfig.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      log.error("Google user info fetch failed", {
        status: response.status,
        statusText: response.statusText,
        errorSnippet: errorText.slice(0, 120),
      });
      throw new Error(
        `Failed to fetch Google user profile: ${response.status} ${response.statusText}`
      );
    }

    const userInfo = await response.json();

    const profile: OAuthUserProfile = {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    };
    log.debug("Google profile parsed", { emailDomain: (profile.email || "").split("@")[1] || null, idPrefix: String(profile.id || "").slice(0,6) });
    return profile;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("Google profile fetch timeout");
    }
    log.error("Google profile fetch error", { error: String(error) });
    throw new Error("Failed to fetch Google user profile");
  }
}

// Get user profile from GitHub
export async function getGitHubUserProfile(
  accessToken: string
): Promise<OAuthUserProfile> {
  const log = createRequestLogger("oauth/github/profile");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 seconds

  try {
    // Get basic user info
    log.debug("Fetching GitHub user", { userInfoHost: new URL(githubOAuthConfig.userInfoUrl).host, token: redact(accessToken) });
    const userResponse = await fetch(githubOAuthConfig.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "SyncTech-App",
        Accept: "application/vnd.github.v3+json",
      },
      signal: controller.signal,
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text().catch(() => "");
      log.error("GitHub user info fetch failed", {
        status: userResponse.status,
        statusText: userResponse.statusText,
        errorSnippet: errorText.slice(0, 120),
      });
      throw new Error(
        `Failed to fetch GitHub user profile: ${userResponse.status} ${userResponse.statusText}`
      );
    }

    const userInfo = await userResponse.json();

    // Get user emails (GitHub doesn't always return email in basic profile)
    log.debug("Fetching GitHub emails", { emailsHost: new URL(githubOAuthConfig.userEmailsUrl).host });
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

    const profile: OAuthUserProfile = {
      id: userInfo.id.toString(),
      email: email,
      name: userInfo.name || userInfo.login,
      picture: userInfo.avatar_url,
    };
    log.debug("GitHub profile parsed", { emailDomain: (profile.email || "").split("@")[1] || null, idPrefix: String(profile.id).slice(0,6) });
    return profile;
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      throw new Error("GitHub profile fetch timeout");
    }
    log.error("GitHub profile fetch error", { error: String(error) });
    throw new Error("Failed to fetch GitHub user profile");
  }
}
