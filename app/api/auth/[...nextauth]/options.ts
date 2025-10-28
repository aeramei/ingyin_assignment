// app/api/auth/[...nextauth]/options.ts
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@/app/generated/prisma";
import { verifyPassword } from "@/lib/auth";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    // Optional: Add credentials provider if you want NextAuth to handle form logins
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const prisma = new PrismaClient();
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
              role: true,
              status: true,
              isTOTPEnabled: true,
            },
          });

          if (!user || user.status !== "ACTIVE") {
            return null;
          }

          const isValidPassword = await verifyPassword(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isTOTPEnabled: user.isTOTPEnabled,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        } finally {
          await prisma.$disconnect();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }: any) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.isTOTPEnabled = user.isTOTPEnabled;
      }

      // Update token if session is updated (e.g., after TOTP setup)
      if (trigger === "update" && session) {
        token.isTOTPEnabled = session.isTOTPEnabled;
      }

      // For OAuth providers, we might need to fetch user data from DB
      if (account?.provider !== "credentials" && token.email) {
        const prisma = new PrismaClient();
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: {
              id: true,
              email: true,
              role: true,
              isTOTPEnabled: true,
            },
          });

          if (dbUser) {
            token.userId = dbUser.id;
            token.role = dbUser.role;
            token.isTOTPEnabled = dbUser.isTOTPEnabled;
          }
        } catch (error) {
          console.error("Error fetching user data for JWT:", error);
        } finally {
          await prisma.$disconnect();
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.isTOTPEnabled = token.isTOTPEnabled;
      }
      return session;
    },
    async signIn({ user, account, profile }: any) {
      // Allow OAuth sign-ins
      if (account?.provider === "google" || account?.provider === "github") {
        return true;
      }

      // For credentials provider, we've already validated in authorize()
      if (account?.provider === "credentials") {
        return true;
      }

      return false;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/error",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
