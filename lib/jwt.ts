// lib/jwt.ts
import jwt from "jsonwebtoken";

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  iss: string; // Issuer
}

export class TokenService {
  private static readonly JWT_SECRET =
    process.env.JWT_SECRET || "your-fallback-secret";
  private static readonly ISSUER = "ingyin-app";

  static generateToken(payload: Omit<TokenPayload, "iss">): string {
    const tokenPayload: TokenPayload = {
      ...payload,
      iss: this.ISSUER,
    };

    return jwt.sign(tokenPayload, this.JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}
