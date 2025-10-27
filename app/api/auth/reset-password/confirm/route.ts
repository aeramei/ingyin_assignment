import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma";
import { createRequestLogger } from "@/lib/logger";
import { TokenService } from "@/lib/jwt";
import { hashPassword } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    const log = createRequestLogger("auth/reset-password/confirm");
    try {
        const { password } = await request.json();
        const finalToken = request.cookies.get("password_reset_final_token")?.value;

        if (!finalToken) {
            return NextResponse.json({ error: "Password reset session not found. Please try again." }, { status: 400 });
        }

        if (!password) {
            return NextResponse.json({ error: "Password is required" }, { status: 400 });
        }

        const payload = await TokenService.verifyTOTPToken(finalToken);
        const hashedPassword = await hashPassword(password);

        await prisma.user.update({
            where: { id: payload.userId },
            data: { password: hashedPassword },
        });

        const response = NextResponse.json({ success: true });
        response.cookies.delete("password_reset_final_token");

        return response;
    } catch (error: any) {
        log.error("Password reset confirmation error", { error: error.message });
        return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
    }
}
