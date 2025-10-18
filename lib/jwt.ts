// lib/jwt.ts
// Edge-compatible JWT utilities using `jose` (works in Next.js Middleware)
import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from "jose";

export interface TokenPayload extends JWTPayload {
  userId: string;
  username: string;
  name?: string;
  role: string;
  iss: string; // Issuer
}

export class TokenService {
  private static readonly JWT_SECRET =
    (process.env.JWT_SECRET as string) || "your-fallback-secret";
  private static readonly ISSUER = "ingyin-app";
  private static readonly EXPIRATION = "7d";

  private static getKey(): Uint8Array {
    // jose expects a Uint8Array for symmetric secrets (HS256)
    return new TextEncoder().encode(this.JWT_SECRET);
  }

  static async generateToken(payload: Omit<TokenPayload, "iss" | "exp" | "iat">): Promise<string> {
    // Ensure `name` claim is always present in the JWT. If not provided, default to empty string.
    const claims = { ...payload, name: (payload as any).name ?? "" };
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(this.ISSUER)
      .setIssuedAt()
      .setExpirationTime(this.EXPIRATION)
      .sign(this.getKey());
    return token;
  }

  static async verifyToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, this.getKey(), {
      issuer: this.ISSUER,
    });
    return payload as TokenPayload;
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return decodeJwt(token) as TokenPayload;
    } catch {
      return null;
    }
  }
}
