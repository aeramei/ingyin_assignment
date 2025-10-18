import { TokenService } from "@/lib/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define routes that should not be protected by the middleware
const publicRoutes = ["/", "/signin", "/register"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  console.log("req.nextUrl.pathname");
  // If the route is public, skip the middleware
  if (publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  // Get the token from the 'token' cookie
  const token = req.cookies.get("token")?.value;

  // If no token is found, redirect to the sign-in page
  if (!token) {
    // Store the intended destination to redirect after login
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  try {
    // 1. Verify the token's signature and expiration
    const decodedPayload = TokenService.verifyToken(token);

    // 2. Check user role (optional, add your logic here)
    // Example: Block access to an '/admin' route for non-admin users
    if (path.startsWith("/admin") && (await decodedPayload).role !== "admin") {
      // Or redirect to an 'unauthorized' page
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // 3. Decode and forward user details to the next route via headers
    const requestHeaders = new Headers(req.headers);
    // Forwarding the entire payload as a stringified JSON object
    requestHeaders.set("x-user-payload", JSON.stringify(decodedPayload));

    // Create a new response with the modified headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  } catch (error) {
    // This block will be executed if the token is expired or invalid
    console.error("Invalid token:", error);

    // Redirect to the sign-in page if token verification fails
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("sessionExpired", "true");
    return NextResponse.redirect(url);
  }
}

// This config specifies which routes the middleware should run on.
export const config = {
  // We use a negative lookahead to exclude files and specific routes.
  // This matcher will apply the middleware to all paths EXCEPT for:
  // - /api/... (API routes)
  // - /_next/static/... (static files)
  // - /_next/image/... (image optimization files)
  // - /favicon.ico (favicon file)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
