// lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { verifyPassword } from "./auth";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { 
            email: credentials.email.toLowerCase() 
          },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            role: true,
            isActive: true,
            isTOTPEnabled: true,
            // include other fields you need
          }
        });

        if (!user || !user.password || !user.isActive) {
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isTOTPEnabled: user.isTOTPEnabled,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Add user info to token on sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isTOTPEnabled = user.isTOTPEnabled;
      }

      // Update token when session is updated (like after 2FA setup)
      if (trigger === "update" && session) {
        token.isTOTPEnabled = session.isTOTPEnabled;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.isTOTPEnabled = token.isTOTPEnabled as boolean;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};