import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentAdmin();

    if (!user) {
      return NextResponse.json(
        { message: "Не авторизован" },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth check error:", error);

    return NextResponse.json(
      { message: "Ошибка проверки авторизации" },
      { status: 500 }
    );
  }
}