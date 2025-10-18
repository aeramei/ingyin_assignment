import { TokenService } from "@/lib/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define routes that should not be protected by the middleware
const publicRoutes = ["/", "/signin", "/register"];

export async function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;
    console.log(`[Middleware] Executing for path: ${path}`);

    // If the route is public, skip the middleware
    if (publicRoutes.includes(path)) {
        console.log(`[Middleware] Public route accessed: ${path}`);
        return NextResponse.next();
    }

    console.log(`[Middleware] Protected route accessed: ${path}`);
    // Get the token from the 'session' cookie
    const token = req.cookies.get("accessToken")?.value;

    // If no token is found, redirect to the sign-in page
    if (!token) {
        console.log("[Middleware] No token found. Redirecting to /signin.");
        // Store the intended destination to redirect after login
        const url = req.nextUrl.clone();
        url.pathname = "/signin";
        url.searchParams.set("redirectedFrom", path);
        return NextResponse.redirect(url);
    }

    console.log(`[Middleware] Token found: ${token}`);

    try {
        // 1. Verify the token's signature and expiration
        console.log("[Middleware] Verifying token...");
        const decodedPayload = await TokenService.verifyToken(token);
        console.log("[Middleware] Token verified successfully. Payload:", decodedPayload);

        // 2. Check user role for admin-only routes (normalize role to lowercase)
        if (path.startsWith("/admindashboard")) {
            const role = String((decodedPayload as any).role || "").toLowerCase();
            if (role !== "admin") {
                console.log(`[Middleware] Non-admin user trying to access /admindashboard. Redirecting to /.`);
                // Redirect non-admins to home page
                return NextResponse.redirect(new URL("/", req.url));
            }
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

        console.log("[Middleware] Forwarding request to next handler.");
        return response;
    } catch (error) {
        // This block will be executed if the token is expired or invalid
        console.error("[Middleware] Invalid token:", error);

        // Redirect to the sign-in page if token verification fails
        const url = req.nextUrl.clone();
        url.pathname = "/signin";
        url.searchParams.set("sessionExpired", "true");
        console.log("[Middleware] Redirecting to /signin due to invalid token.");
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
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)" ],
};
