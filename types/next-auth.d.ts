import NextAuth from "next-auth";

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
    accessToken?: string; // Add this line
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: string;
    isTOTPEnabled: boolean;
    totpVerified: boolean;
    accessToken?: string; // Add this line
  }
}
