import { TokenService } from "@/lib/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRequestLogger } from "@/lib/logger";

// Define routes that should not be protected by the middleware
const publicRoutes = ["/", "/signin", "/register", "/auth/signin", "/auth/error", "/verify-totp", "/verify-otp"]; 

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const log = createRequestLogger("middleware");
  log.debug("Executing middleware", { path });

  // If the route is public, skip the rest of middleware
  if (publicRoutes.includes(path)) {
    log.debug("Public route; skipping auth");
    return NextResponse.next();
  }

  // Protected route handling
  const token = req.cookies.get("accessToken")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirectedFrom", path);
    log.debug("Missing token; redirecting to signin", { path });
    return NextResponse.redirect(url);
  }

  try {
    const decodedPayload = await TokenService.verifyAccessToken(token);

    // OTP gating: redirect to /verify-totp and preserve intended path (no PII in URL)
    if (TokenService.requiresOTP(decodedPayload as any)) {
      const url = req.nextUrl.clone();
      url.pathname = "/verify-totp";
      url.searchParams.set("redirectTo", path);
      log.debug("OTP required; redirecting to verify-totp", { redirectTo: path });
      return NextResponse.redirect(url);
    }

    // Admin routes
    if (path.startsWith("/admindashboard")) {
      const role = String((decodedPayload as any).role || "").toLowerCase();
      if (role !== "admin") {
        log.debug("Admin route access denied; redirecting to home", { role });
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Forward user payload header
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-payload", JSON.stringify(decodedPayload));
    log.debug("Auth passed; forwarding request");

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (error) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("sessionExpired", "true");
    log.debug("Token verification failed; redirecting to signin");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
