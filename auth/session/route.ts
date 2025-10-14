import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}
