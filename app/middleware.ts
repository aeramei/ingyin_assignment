// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Augment NextRequest from next/server to include the nextauth property injected by next-auth middleware
declare module "next/server" {
  interface NextRequest {
    nextauth?: {
      token?: any;
      // add more fields here if you want stronger typing for the token
    };
  }
}

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/signin",
  "/register",
  "/auth/error",
  "/verify-totp",
  "/api/auth",
];

// Routes that require TOTP verification after initial auth
const totpProtectedRoutes = [
  "/dashboard",
  "/admindashboard",
  "/profile",
  "/settings",
  "/api/user",
  "/authenticated", // Add authenticated page to protected routes
];

// Routes that are exempt from TOTP verification
const totpExemptRoutes = [
  "/api/auth/2fa/setup",
  "/api/auth/2fa/verify",
  "/api/auth/2fa/disable",
  "/api/auth/2fa/regenerate-backup-codes",
  "/api/auth/2fa/status",
];

export default withAuth(
  function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    const token = req.nextauth?.token;

    // If the route is public, allow access
    if (publicRoutes.some((route) => path.startsWith(route))) {
      return addSecurityHeaders(req, NextResponse.next());
    }

    // User is authenticated at this point (withAuth ensures this)
    console.log(`Authenticated user accessing: ${path}`, {
      userId: token?.sub,
      email: token?.email,
      role: token?.role,
      isTOTPEnabled: token?.isTOTPEnabled,
      totpVerified: token?.totpVerified,
    });

    // Check if route requires TOTP verification
    const requiresTOTP =
      totpProtectedRoutes.some((route) => path.startsWith(route)) &&
      !totpExemptRoutes.some((route) => path.startsWith(route));

    if (requiresTOTP && token) {
      const userHasTOTP = token.isTOTPEnabled;
      const isTOTPVerified = token.totpVerified;

      console.log(
        `TOTP Check - Enabled: ${userHasTOTP}, Verified: ${isTOTPVerified}, Route: ${path}`
      );

      if (userHasTOTP && !isTOTPVerified) {
        // TOTP required but not verified - redirect to TOTP verification
        console.log(`Redirecting to TOTP verification for user: ${token.sub}`);
        return redirectToTOTPVerification(req, path, token.sub);
      }
    }

    // Check user role for admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Add user info to headers for API routes (for your existing API compatibility)
    if (path.startsWith("/api/") && token) {
      const requestHeaders = new Headers(req.headers);

      // For compatibility with your existing APIs that expect these headers
      if (token.sub) {
        requestHeaders.set("x-user-id", token.sub);
      }
      if (token.role) {
        requestHeaders.set("x-user-role", token.role);
      }
      if (token.email) {
        requestHeaders.set("x-user-email", token.email);
      }

      // Include the full token payload for existing API compatibility
      requestHeaders.set(
        "x-user-payload",
        JSON.stringify({
          userId: token.sub,
          email: token.email,
          role: token.role,
          isTOTPEnabled: token.isTOTPEnabled,
          totpVerified: token.totpVerified,
        })
      );

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      return addSecurityHeaders(req, response);
    }

    return addSecurityHeaders(req, NextResponse.next());
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        // Public routes don't require authentication
        if (publicRoutes.some((route) => path.startsWith(route))) {
          return true;
        }

        // For all other routes, require authentication
        return !!token;
      },
    },
  }
);

// Helper function to add security headers
function addSecurityHeaders(
  req: NextRequest,
  response: NextResponse
): NextResponse {
  // Security headers for all responses
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Additional security for sensitive routes
  if (req.nextUrl.pathname.startsWith("/api/auth/2fa")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

// Helper function to redirect to TOTP verification
function redirectToTOTPVerification(
  req: NextRequest,
  originalPath: string,
  userId: string
) {
  const url = req.nextUrl.clone();
  url.pathname = "/verify-totp";
  url.searchParams.set("redirectTo", originalPath);
  url.searchParams.set("userId", userId);

  return NextResponse.redirect(url);
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
