
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

export async function GET() {
  try {
    await connectDB();

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("Ошибка загрузки пользователей:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить пользователей" },
      { status: 500 }
    );
  }
}
