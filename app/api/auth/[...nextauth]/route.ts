// app/api/auth/[...nextauth]/route.ts
import NextAuth, { Session, type AuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

// Extend built-in types
declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    isTOTPEnabled: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: string;
      isTOTPEnabled: boolean;
    };
    totpVerified: boolean;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: string;
    isTOTPEnabled: boolean;
    totpVerified: boolean;
    accessToken?: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/auth/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            console.error("Login API error:", data.error);
            return null;
          }

          if (data.requiresTOTP) {
            throw new Error("TOTP_REQUIRED");
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            isTOTPEnabled: data.user.isTOTPEnabled,
          };
        } catch (error: any) {
          console.error("Authorization error:", error);
          if (error.message === "TOTP_REQUIRED") {
            throw error;
          }
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
      httpOptions: {
        timeout: 10000,
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      httpOptions: {
        timeout: 10000,
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
        token.role = user.role || "USER";
        token.isTOTPEnabled = user.isTOTPEnabled || false;
        token.totpVerified = false;
      }

      // Handle OAuth providers
      if (account) {
        token.accessToken = account.access_token;

        // For OAuth users, set default values
        if (account.provider !== "credentials") {
          token.role = token.role || "USER";
          token.isTOTPEnabled = token.isTOTPEnabled || false;
          token.totpVerified = token.totpVerified || false;
        }
      }

      // Update TOTP verification status when session is updated
      if (trigger === "update" && session?.totpVerified !== undefined) {
        token.totpVerified = session.totpVerified;
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.isTOTPEnabled = token.isTOTPEnabled as boolean;
        session.totpVerified = token.totpVerified as boolean;

        if (token.accessToken) {
          session.accessToken = token.accessToken as string;
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect OAuth users to /authenticated
      if (url.includes("/api/auth/callback")) {
        return `${baseUrl}/authenticated`;
      }

      // For other cases, use default behavior
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
