
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { connectDB } from "@/lib/db";
import Ticket from "@/lib/models/Ticket";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function findEmail(ticket: any): string {
  if (ticket.email?.trim()) {
    return ticket.email.trim();
  }

  const firstIncomingMessage = ticket.messages?.find(
    (message: any) => message.direction === "in"
  );

  const text = firstIncomingMessage?.text || ticket.body || "";
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  return match ? match[0] : "";
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Некорректный ID тикета" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Введите текст ответа" },
        { status: 400 }
      );
    }

    const {
      EMAIL_HOST,
      EMAIL_PORT,
      EMAIL_USER,
      EMAIL_PASS,
    } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
      return NextResponse.json(
        { error: "Не настроены параметры почтового сервера" },
        { status: 500 }
      );
    }

    await connectDB();

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return NextResponse.json(
        { error: "Тикет не найден" },
        { status: 404 }
      );
    }

    const recipient = findEmail(ticket);

    if (!recipient) {
      return NextResponse.json(
        {
          error: "Не найден email клиента. Укажите email в карточке тикета.",
        },
        { status: 400 }
      );
    }

    const port = Number(EMAIL_PORT);

    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port,
      secure: port === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: EMAIL_USER,
      to: recipient,
      subject: `Ответ: ${ticket.subject || "Обращение в поддержку"}`,
      text,
      html: `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;">${escapeHtml(text)}</div>`,
    });

    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      {
        $set: {
          email: recipient,
          status: "answered",
        },
        $push: {
          messages: {
            text,
            direction: "out",
            date: new Date(),
          },
        },
      },
      { new: true }
    );

    return NextResponse.json({
      message: "Ответ успешно отправлен",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Ошибка при отправке ответа:", error);

    return NextResponse.json(
      { error: "Не удалось отправить ответ" },
      { status: 500 }
    );
  }
}
