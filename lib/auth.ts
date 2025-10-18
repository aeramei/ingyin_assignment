import bcrypt from "bcryptjs";
import { TokenService } from "@/lib/jwt";

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12");

export interface TokenPayload {
  userId: string;
  email: string;
  name?: string;
  role: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// FIX: Use module caching to prevent reinitialization
let users: Map<string, any>;

function getUserStore() {
  if (!users) {
    users = new Map<string, any>();
  }
  return users;
}

export async function findUserByEmail(email: string) {
  const userStore = getUserStore();
  return userStore.get(email);
}

export async function createUser(userData: { email: string; name: string }) {
  const userStore = getUserStore();

  const user = {
    id: Date.now().toString(),
    email: userData.email,
    name: userData.name,
    role: "user", // Added role field
    createdAt: new Date(),
  };

  userStore.set(userData.email, user);
  return user;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Token generation using TokenService (Edge-compatible)
export async function generateAccessToken(
  payload: TokenPayload
): Promise<string> {
  const token = await TokenService.generateToken({
    userId: payload.userId,
    username: payload.email,
    name: payload.name,
    role: payload.role,
  });
  return token;
}

export async function generateRefreshToken(
  payload: TokenPayload
): Promise<string> {
  const token = await TokenService.generateToken({
    userId: payload.userId,
    username: payload.email,
    name: payload.name,
    role: payload.role,
  });
  return token;
}

// Token verification using TokenService
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  try {
    const payload = await TokenService.verifyToken(token);
    return {
      userId: payload.userId as string,
      email: (payload as any).username as string,
      name: (payload as any).name as string | undefined,
      role: payload.role as string,
    };
  } catch (error) {
    throw new AuthError("Invalid or expired access token");
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  try {
    const payload = await TokenService.verifyToken(token);
    return {
      userId: payload.userId as string,
      email: (payload as any).username as string,
      name: (payload as any).name as string | undefined,
      role: payload.role as string,
    };
  } catch (error) {
    throw new AuthError("Invalid or expired refresh token");
  }
}

// Utility to get user from token
export async function getUserFromToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    return await verifyAccessToken(token);
  } catch (error) {
    return null;
  }
}
