import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger } from "@/lib/logger";
import { TokenService } from "@/lib/jwt";
import { generateOTP, storeOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/gmail";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    const log = createRequestLogger("auth/forgot-password");
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { id: true, email: true, isTOTPEnabled: true, status: true },
        });

        if (!user || user.status !== "ACTIVE") {
            // To prevent user enumeration, we send a success response even if the user doesn't exist.
            log.info("Forgot password request for non-existent or inactive user", { email });
            return NextResponse.json({ success: true, message: "If an account with that email exists, a password reset link has been sent." });
        }

        if (user.isTOTPEnabled) {
            // User has 2FA, so we require TOTP verification to reset the password.
            const token = await TokenService.generateTOTPVerificationToken(user.id, user.email, user.email, "USER");
            const response = NextResponse.json({ success: true, requiresTOTP: true });
            response.cookies.set("password_reset_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 10 * 60, // 10 minutes
                path: "/",
            });
            return response;
        } else {
            // User does not have 2FA, so we use email OTP.
            const otp = generateOTP();
            await storeOTP(user.id, otp);
            await sendOTPEmail(user.email, otp, "Password Reset");

            const token = await TokenService.generateTOTPVerificationToken(user.id, user.email, user.email, "USER");
            const response = NextResponse.json({ success: true, requiresOTP: true });
            response.cookies.set("password_reset_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 10 * 60, // 10 minutes
                path: "/",
            });
            return response;
        }
    } catch (error: any) {
        log.error("Forgot password error", { error: error.message });
        return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }
}
