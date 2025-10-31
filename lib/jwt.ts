// Edge-compatible JWT utilities using `jose` (works in Next.js Middleware)
import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from "jose";

export interface TokenPayload extends JWTPayload {
  userId: string;
  username: string;
  email: string;
  name?: string;
  role: string;
  isTOTPEnabled: boolean;
  // New OTP gating flags for email-based OTP flow
  otpRequired?: boolean; // true if user must complete OTP before full access
  otpVerified?: boolean; // true once OTP is completed
  // Backward-compat with older tokens
  totpVerified?: boolean; // Temporary flag for legacy TOTP verification tokens
  iss: string; // Issuer
}

export class TokenService {
  static generateToken(arg0: {
    userId: string;
    username: string;
    name: string | undefined;
    role: string;
  }) {
    throw new Error("Method not implemented.");
  }
  private static readonly JWT_SECRET =
    (process.env.JWT_SECRET as string) || "your-fallback-secret";
  private static readonly ISSUER = "ingyin-app";
  private static readonly ACCESS_EXPIRATION = "15m"; // Shorter for security
  private static readonly REFRESH_EXPIRATION = "7d";
  private static readonly TOTP_VERIFICATION_EXPIRATION = "10m"; // For TOTP verification step

  private static getKey(): Uint8Array {
    return new TextEncoder().encode(this.JWT_SECRET);
  }

  // Generate access token (short-lived)
  static async generateAccessToken(
    payload: Omit<TokenPayload, "iss" | "exp" | "iat" | "totpVerified">
  ): Promise<{ token: string; expiresAt: Date }> {
    const claims: Record<string, any> = {
      ...payload,
      name: payload.name ?? "",
      type: "access",
    };

    // Propagate OTP gating flags when provided
    if (typeof (payload as any).otpRequired !== "undefined") {
      claims.otpRequired = (payload as any).otpRequired;
    }
    if (typeof (payload as any).otpVerified !== "undefined") {
      claims.otpVerified = (payload as any).otpVerified;
      // keep legacy totpVerified aligned if present in older checks
      claims.totpVerified = (payload as any).otpVerified;
    }

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(this.ISSUER)
      .setIssuedAt()
      .setExpirationTime(this.ACCESS_EXPIRATION)
      .sign(this.getKey());

    const decoded = decodeJwt(token);
    const expiresAt = new Date((decoded.exp as number) * 1000);

    return { token, expiresAt };
  }

  // Generate refresh token (long-lived)
  static async generateRefreshToken(
    payload: Omit<TokenPayload, "iss" | "exp" | "iat" | "totpVerified">
  ): Promise<{ token: string; expiresAt: Date }> {
    const claims = {
      ...payload,
      name: payload.name ?? "",
      type: "refresh",
    };

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(this.ISSUER)
      .setIssuedAt()
      .setExpirationTime(this.REFRESH_EXPIRATION)
      .sign(this.getKey());

    const decoded = decodeJwt(token);
    const expiresAt = new Date((decoded.exp as number) * 1000);

    return { token, expiresAt };
  }

  // Generate TOTP verification token (for the intermediate step)
  static async generateTOTPVerificationToken(
    userId: string,
    email: string,
    username: string,
    role: string,
    name?: string
  ): Promise<string> {
    const claims = {
      userId,
      email,
      username,
      role,
      name: name ?? "",
      isTOTPEnabled: true, // This token is only used when TOTP is enabled
      totpVerified: false, // Explicitly false until verified
      type: "totp_verification",
    };

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(this.ISSUER)
      .setIssuedAt()
      .setExpirationTime(this.TOTP_VERIFICATION_EXPIRATION)
      .sign(this.getKey());
    return token;
  }

  // Verify token with optional type checking
  static async verifyToken(
    token: string,
    expectedType?: "access" | "refresh" | "totp_verification"
  ): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, this.getKey(), {
      issuer: this.ISSUER,
    });

    const tokenPayload = payload as TokenPayload;

    // Validate token type if expected
    if (expectedType && tokenPayload.type !== expectedType) {
      throw new Error(
        `Invalid token type: expected ${expectedType}, got ${tokenPayload.type}`
      );
    }

    return tokenPayload;
  }

  // Specifically verify access token
  static async verifyAccessToken(token: string): Promise<TokenPayload> {
    return this.verifyToken(token, "access");
  }

  // Specifically verify refresh token
  static async verifyRefreshToken(token: string): Promise<TokenPayload> {
    return this.verifyToken(token, "refresh");
  }

  // Specifically verify TOTP verification token
  static async verifyTOTPToken(token: string): Promise<TokenPayload> {
    return this.verifyToken(token, "totp_verification");
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return decodeJwt(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  // Check if token requires TOTP verification (legacy)
  static requiresTOTPVerification(payload: TokenPayload): boolean {
    return payload.isTOTPEnabled && payload.totpVerified === false;
  }

  // Check if token requires OTP gating (email OTP or legacy totpVerified)
  static requiresOTP(payload: TokenPayload): boolean {
    const emailOtpGate = payload.otpRequired === true && payload.otpVerified !== true;
    const legacyTotpGate = payload.isTOTPEnabled && payload.totpVerified === false;
    return Boolean(emailOtpGate || legacyTotpGate);
  }

  // Extract user ID safely from token
  static getUserIdFromToken(token: string): string | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.userId || null;
    } catch {
      return null;
    }
  }
}
