import { TokenService } from "@/lib/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define routes that should not be protected by the middleware
// NOTE: We intentionally exclude "/verify-otp" from public skipping so we can
// append email/name params from JWT when needed.
const publicRoutes = ["/", "/signin", "/register", "/auth/signin", "/auth/error"]; 

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // console.log(`[Middleware] Executing for path: ${path}`);

  // Special handling for /verify-otp (not fully public): we may add params
  if (path === "/verify-otp") {
    const token = req.cookies.get("accessToken")?.value;
    if (!token) {
      // Allow reaching the page without token (e.g., first-time deep link)
      return NextResponse.next();
    }

    try {
      const decoded = await TokenService.verifyAccessToken(token);
      // If OTP already satisfied, redirect away from verify page
      if (!TokenService.requiresOTP(decoded)) {
        return NextResponse.redirect(new URL("/authenticated", req.url));
      }

      // Ensure email and name are present as query params
      const url = req.nextUrl.clone();
      const haveEmail = url.searchParams.has("email");
      const haveName = url.searchParams.has("name");
      const email = (decoded as any).email || "";
      const name = (decoded as any).name || "";

      if (!haveEmail || !haveName) {
        if (!haveEmail && email) url.searchParams.set("email", email);
        if (!haveName && name) url.searchParams.set("name", name);
        return NextResponse.redirect(url);
      }

      // Already has required params
      return NextResponse.next();
    } catch {
      // Token invalid/expired: let the page load; it can handle re-request or show error
      return NextResponse.next();
    }
  }

  // If the route is public, skip the rest of middleware
  if (publicRoutes.includes(path)) {
    return NextResponse.next();
  }

  // Protected route handling
  const token = req.cookies.get("accessToken")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  try {
    const decodedPayload = await TokenService.verifyAccessToken(token);

    // OTP gating: redirect to /verify-otp with email/name params
    if (TokenService.requiresOTP(decodedPayload as any)) {
      const url = req.nextUrl.clone();
      url.pathname = "/verify-otp";
      const email = (decodedPayload as any).email || "";
      const name = (decodedPayload as any).name || "";
      if (email) url.searchParams.set("email", email);
      if (name) url.searchParams.set("name", name);
      return NextResponse.redirect(url);
    }

    // Admin routes
    if (path.startsWith("/admindashboard")) {
      const role = String((decodedPayload as any).role || "").toLowerCase();
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Forward user payload header
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-payload", JSON.stringify(decodedPayload));

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (error) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("sessionExpired", "true");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
