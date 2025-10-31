// lib/auth.ts
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { TokenService, type TokenPayload } from "@/lib/jwt";
import crypto from "crypto";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT token helpers (re-exported for convenience)
export async function generateAccessToken(
  payload: Omit<TokenPayload, "iss" | "exp" | "iat" | "totpVerified">
): Promise<{ token: string; expiresAt: Date }> {
  return TokenService.generateAccessToken(payload);
}

export async function generateRefreshToken(
  payload: Omit<TokenPayload, "iss" | "exp" | "iat" | "totpVerified">
): Promise<{ token: string; expiresAt: Date }> {
  return TokenService.generateRefreshToken(payload);
}

export async function verifyAccessToken(token: string) {
  return TokenService.verifyAccessToken(token);
}

export async function verifyAdmin(token: string): Promise<TokenPayload> {
    const payload = await TokenService.verifyAccessToken(token);
    if (payload.role !== 'ADMIN') {
        throw new Error('Unauthorized: Admin role required');
    }
    return payload;
}

export async function verifyRefreshToken(token: string) {
  return TokenService.verifyRefreshToken(token);
}

// Basic user helpers used by some routes (OTP flow)
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function createUser({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  // Generate a strong random password (user can set a real one later)
  const random = crypto.randomBytes(32).toString("hex");
  const password = await hashPassword(random);

  return prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      password,
      role: "USER",
      status: "ACTIVE",
      company: "Not specified",
      plan: "starter",
    },
  });
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
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

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase(),
          },
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

        if (!user || !user.password || user.status !== "ACTIVE") {
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Return user with custom fields - this matches our extended User type
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isTOTPEnabled: user.isTOTPEnabled,
        };
      },
    }),
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
        token.isTOTPEnabled = session.user.isTOTPEnabled;
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
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
