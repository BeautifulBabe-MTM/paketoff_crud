
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Ticket from "@/lib/models/Ticket";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }
    await connectDB();

    const tickets = await Ticket.find()
      .sort({ date: -1 })
      .lean();

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Ошибка при загрузке тикетов:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить тикеты" },
      { status: 500 }
    );
  }
}
