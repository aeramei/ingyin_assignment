import {NextRequest, NextResponse} from "next/server";
import {verifyPassword} from "@/lib/auth";
import {TokenService} from "@/lib/jwt";
import {PrismaClient} from "@/app/generated/prisma";

// ✅ reCAPTCHA VERIFICATION FUNCTION
async function verifyRecaptcha(
    token: string
): Promise<{ success: boolean; score?: number }> {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
        throw new Error("RECAPTCHA_SECRET_KEY not configured");
    }

    try {
        const response = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `secret=${secretKey}&response=${token}`,
            }
        );

        if (!response.ok) {
            throw new Error(
                `reCAPTCHA API responded with status: ${response.status}`
            );
        }

        const data = await response.json();
        console.log("reCAPTCHA verification response:", data);
        return data;
    } catch (error) {
        console.error("reCAPTCHA verification error:", error);
        throw new Error("Failed to verify reCAPTCHA token");
    }
}

export async function POST(request: NextRequest) {
    let prisma;

    try {
        prisma = new PrismaClient();

        const {email, password, recaptchaToken} = await request.json();

        console.log("Login attempt for:", email);

        // ✅ VALIDATE reCAPTCHA TOKEN FIRST
        if (!recaptchaToken) {
            console.error("No reCAPTCHA token provided");
            return NextResponse.json(
                {
                    error: "Security verification failed. Please complete the reCAPTCHA.",
                },
                {status: 400}
            );
        }

        // ✅ VERIFY reCAPTCHA
        console.log("Verifying reCAPTCHA token...");
        const recaptchaResult = await verifyRecaptcha(recaptchaToken);

        if (!recaptchaResult.success) {
            console.error("reCAPTCHA verification failed:", recaptchaResult);
            return NextResponse.json(
                {error: "Security verification failed. Please try again."},
                {status: 400}
            );
        }

        console.log("reCAPTCHA verification passed");

        // ✅ BASIC VALIDATION
        if (!email || !password) {
            return NextResponse.json(
                {error: "Email and password are required"},
                {status: 400}
            );
        }

        // ✅ FIND USER WITH TOTP STATUS
        const user = await prisma.user.findUnique({
            where: {email: email.toLowerCase()},
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                role: true,
                status: true,
                company: true,
                plan: true,
                isTOTPEnabled: true,
            },
        });

        if (!user) {
            console.log("User not found:", email);
            return NextResponse.json(
                {error: "Invalid email or password"},
                {status: 401}
            );
        }

        // ✅ CHECK USER STATUS
        if (user.status !== "ACTIVE") {
            console.log("Inactive user attempt:", email);
            return NextResponse.json(
                {error: "Account is not active. Please contact support."},
                {status: 401}
            );
        }

        // ✅ VERIFY PASSWORD
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            console.log("Invalid password for user:", email);
            return NextResponse.json(
                {error: "Invalid email or password"},
                {status: 401}
            );
        }

        console.log("Password verified for user:", user.id);

        // ✅ TOTP CHECK - NEW LOGIC
        if (user.isTOTPEnabled) {
            console.log("TOTP required for user:", user.id);

            // Generate TOTP verification token (intermediate step)
            const totpToken = await TokenService.generateTOTPVerificationToken(
                user.id,
                user.email,
                user.email,
                user.role,
                user.name || undefined
            );

            // ✅ CREATE AUDIT LOG FOR TOTP REQUIRED
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: "LOGIN_TOTP_REQUIRED",
                    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
                    userAgent: request.headers.get("user-agent") || "unknown",
                    details: {
                        recaptchaVerified: true,
                        recaptchaScore: recaptchaResult.score || 0,
                        loginMethod: "email_password",
                        totpRequired: true,
                    },
                },
            });

            return NextResponse.json({
                success: true,
                requiresTOTP: true,
                message: "TOTP verification required",
                totpToken,
                userId: user.id,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
            });
        }

        // ✅ NO TOTP REQUIRED - GENERATE FINAL TOKENS
        console.log("TOTP not enabled, generating final tokens for user:", user.id);

        const accessToken = await TokenService.generateAccessToken(
            {
                userId: user.id,
                email: user.email,
                username: user.email,
                name: user.name || undefined,
                otpRequired: true,
                otpVerified: false,
                role: user.role,
                isTOTPEnabled: false,
            }
        );

        const refreshToken = await TokenService.generateRefreshToken({
            userId: user.id,
            email: user.email,
            username: user.email,
            name: user.name || undefined,
            otpRequired: true,
            otpVerified: false,
            role: user.role,
            isTOTPEnabled: false,
        });

        // ✅ CREATE SESSION
        await prisma.session.create({
            data: {
                userId: user.id,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        // ✅ CREATE AUDIT LOG FOR SUCCESSFUL LOGIN
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: "LOGIN",
                ipAddress: request.headers.get("x-forwarded-for") || "unknown",
                userAgent: request.headers.get("user-agent") || "unknown",
                details: {
                    recaptchaVerified: true,
                    recaptchaScore: recaptchaResult.score || 0,
                    loginMethod: "email_password",
                    totpRequired: false,
                },
            },
        });

        // ✅ PREPARE RESPONSE
        const response = NextResponse.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                company: user.company,
                plan: user.plan,
                isTOTPEnabled: false,
            },
        });

        // ✅ SET HTTP-ONLY COOKIES
        response.cookies.set("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60,
            path: "/",
        });

        response.cookies.set("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60,
            path: "/",
        });

        console.log("Login successful for user:", user.id);
        return response;
    } catch (error) {
        console.error("Login error:", error);

        if (error instanceof Error) {
            if (
                error.message.includes("reCAPTCHA") ||
                error.message.includes("RECAPTCHA")
            ) {
                return NextResponse.json(
                    {error: "Security service unavailable. Please try again later."},
                    {status: 503}
                );
            }

            if (
                error.message.includes("Prisma") ||
                error.message.includes("database")
            ) {
                return NextResponse.json(
                    {error: "Database connection error. Please try again."},
                    {status: 503}
                );
            }
        }

        return NextResponse.json(
            {error: "Internal server error"},
            {status: 500}
        );
    } finally {
        if (prisma) {
            await prisma.$disconnect();
        }
    }
}
