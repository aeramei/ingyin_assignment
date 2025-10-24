import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Import the actual authOptions
import { TOTPService } from "@/lib/totp-service";
import { EncryptionService } from "@/lib/encryption";
import { PrismaClient } from "@/app/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log("TOTP Setup API called");

    // Get session with the actual authOptions
    const session = await getServerSession(authOptions);

    console.log("Session debug:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!session?.user?.email,
      email: session?.user?.email,
    });

    // If no session, return unauthorized (remove the test mode for now)
    if (!session?.user?.email) {
      console.log("No session found - user not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true, isTOTPEnabled: true },
    });

    if (!user) {
      console.log("User not found in database for email:", userEmail);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isTOTPEnabled) {
      console.log("TOTP already enabled for user");
      return NextResponse.json(
        { error: "TOTP is already enabled" },
        { status: 400 }
      );
    }

    // Generate TOTP secret
    const secret = TOTPService.generateSecret();
    console.log("Generated secret");

    // Generate QR code
    const qrCodeUrl = await TOTPService.generateQRCode(secret, user.email);
    console.log("QR Code URL generated");

    // Generate backup codes
    const backupCodes = TOTPService.generateBackupCodes();
    console.log("Backup codes generated");

    // Encrypt data
    const encryptedSecret = EncryptionService.encrypt(
      secret,
      process.env.TOTP_SECRET_ENCRYPTION_KEY!
    );

    const encryptedBackupCodes = backupCodes.map((code) =>
      EncryptionService.encrypt(code, process.env.BACKUP_CODES_ENCRYPTION_KEY!)
    );

    console.log("Returning TOTP setup data");

    return NextResponse.json({
      success: true,
      qrCodeUrl,
      secret,
      backupCodes,
      tempData: {
        encryptedSecret,
        encryptedBackupCodes,
      },
    });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Failed to setup TOTP" },
      { status: 500 }
    );
  }
}
