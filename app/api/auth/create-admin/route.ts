import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@/app/generated/prisma";

export async function GET() {
  let prisma;

  try {
    prisma = new PrismaClient();

    // Admin credentials
    const adminEmail = "ingyinaera@gmail.com";
    const adminPassword = "ingyin8894";
    const adminName = "Admin User";

    console.log("Creating admin user via GET:", adminEmail);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        message: "Admin user already exists",
        user: {
          email: existingAdmin.email,
          role: existingAdmin.role,
          status: existingAdmin.status,
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: "ADMIN",
        company: "",
        plan: "",
        status: "ACTIVE",
      },
    });

    console.log("Admin user created successfully via GET");

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully via GET request",
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        status: adminUser.status,
      },
      loginCredentials: {
        email: adminEmail,
        password: adminPassword,
      },
    });
  } catch (error: any) {
    console.error("Admin creation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create admin user",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

export async function POST() {
  // You can keep the POST method as well for API calls
  return GET();
}
