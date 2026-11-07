
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Ticket from "@/lib/models/Ticket";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const targetTicketNumber = Number(body.targetTicketNumber);
    const ticketsToMerge = body.ticketsToMerge;

    if (
      !Number.isInteger(targetTicketNumber) ||
      targetTicketNumber <= 0 ||
      !Array.isArray(ticketsToMerge) ||
      ticketsToMerge.length === 0
    ) {
      return NextResponse.json(
        { error: "Нужно указать целевой тикет и тикеты для слияния" },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(ticketsToMerge)];

    if (
      uniqueIds.some(
        (id) =>
          typeof id !== "string" ||
          !mongoose.Types.ObjectId.isValid(id)
      )
    ) {
      return NextResponse.json(
        { error: "Переданы некорректные ID тикетов" },
        { status: 400 }
      );
    }

    await connectDB();

    const targetTicket = await Ticket.findOne({
      ticketNumber: targetTicketNumber,
    });

    if (!targetTicket) {
      return NextResponse.json(
        { error: "Целевой тикет не найден" },
        { status: 404 }
      );
    }

    // Исключаем целевой тикет из списка объединяемых,
    // чтобы не добавлять его сообщения повторно.
    const sourceIds = uniqueIds.filter(
      (id) => id !== targetTicket._id.toString()
    );

    if (sourceIds.length === 0) {
      return NextResponse.json(
        { error: "Выберите хотя бы один другой тикет для объединения" },
        { status: 400 }
      );
    }

    const mergeTickets = await Ticket.find({
      _id: { $in: sourceIds },
    });

    if (mergeTickets.length !== sourceIds.length) {
      return NextResponse.json(
        { error: "Один или несколько тикетов не найдены" },
        { status: 404 }
      );
    }

    const sameUser = mergeTickets.every((ticket: any) => {
      const targetEmail = targetTicket.email?.trim().toLowerCase();
      const ticketEmail = ticket.email?.trim().toLowerCase();

      if (targetEmail && ticketEmail) {
        return targetEmail === ticketEmail;
      }

      return targetTicket.from === ticket.from;
    });

    if (!sameUser) {
      return NextResponse.json(
        { error: "Можно объединять только тикеты одного пользователя" },
        { status: 400 }
      );
    }

    const mergedMessages = [
      ...targetTicket.messages,
      ...mergeTickets.flatMap((ticket: any) => ticket.messages),
    ];

    mergedMessages.sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    targetTicket.messages = mergedMessages;
    targetTicket.status = "awaiting reply";

    await targetTicket.save();

    await Ticket.updateMany(
      { _id: { $in: sourceIds } },
      { $set: { status: "answered" } }
    );

    return NextResponse.json({
      success: true,
      message: "Тикеты успешно объединены",
      targetTicket,
    });
  } catch (error) {
    console.error("Ошибка при объединении тикетов:", error);

    return NextResponse.json(
      { error: "Ошибка при объединении тикетов" },
      { status: 500 }
    );
  }
}
