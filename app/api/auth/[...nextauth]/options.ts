// app/api/auth/[...nextauth]/options.ts
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

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
  ],
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.userId = user.id;
        token.role = "USER";
        token.isTOTPEnabled = false;
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
  },
  pages: {
    signIn: "/signin",
    error: "/error",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
