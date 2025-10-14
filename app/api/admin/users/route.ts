import { PrismaClient } from "@/app/generated/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  let prisma;

  try {
    prisma = new PrismaClient();

    // Fetch all users from database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        company: true,
        plan: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert to the format expected by your frontend
    const formattedUsers = users.map(
      (user: {
        [x: string]: any;
        id: any;
        name: any;
        email: any;
        role: any;
        company: any;
        plan: any;
        createdAt: { toISOString: () => any };
        status: string;
      }) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        plan: user.plan,
        createdAt: user.createdAt.toISOString(),
        status: user.status.toLowerCase() as "active" | "inactive",
      })
    );

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
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
