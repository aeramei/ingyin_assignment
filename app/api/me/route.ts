import { NextRequest, NextResponse } from "next/server";
import { TokenService } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("accessToken")?.value;
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await TokenService.verifyToken(accessToken);

    const user = {
      userId: payload.userId as string,
      email: (payload as any).email as string,
      name: (payload as any).name as string | undefined,
      role: payload.role as string,
    };
    console.log(payload)

    const token = {
      exp: (payload.exp as number | undefined) ?? null,
      iat: (payload.iat as number | undefined) ?? null,
    };

    return NextResponse.json({ user, token });
  } catch (error) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
