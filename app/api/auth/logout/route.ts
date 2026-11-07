import { NextResponse } from "next/server";
import { removeAuthCookie } from "@/lib/auth";

export async function POST() {
  try {
    await removeAuthCookie();

    return NextResponse.json({
      message: "Вы вышли из системы",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      { message: "Ошибка при выходе из системы" },
      { status: 500 }
    );
  }
}