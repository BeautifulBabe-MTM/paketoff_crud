
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";

type Context = {
  params: Promise<{ id: string }>;
};

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Получение пользователя
export async function GET(
  request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        { error: "Некорректный ID пользователя" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findById(id)
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Ошибка получения пользователя:", error);

    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}

// Редактирование пользователя
export async function PATCH(
  request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        { error: "Некорректный ID пользователя" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const updates: {
      name?: string;
      login?: string;
      email?: string;
      discount?: number;
    } = {};

    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Имя не может быть пустым" },
          { status: 400 }
        );
      }

      updates.name = body.name.trim();
    }

    if ("login" in body) {
      if (typeof body.login !== "string" || !body.login.trim()) {
        return NextResponse.json(
          { error: "Логин не может быть пустым" },
          { status: 400 }
        );
      }

      updates.login = body.login.trim();
    }

    if ("email" in body) {
      if (
        typeof body.email !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
      ) {
        return NextResponse.json(
          { error: "Некорректный email" },
          { status: 400 }
        );
      }

      updates.email = body.email.trim();
    }

    if ("discount" in body) {
      const discount = Number(body.discount);

      if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
        return NextResponse.json(
          { error: "Скидка должна быть от 0 до 100" },
          { status: 400 }
        );
      }

      updates.discount = discount;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Нет данных для обновления" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Ошибка обновления пользователя:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Такой логин или email уже существует" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Ошибка обновления пользователя" },
      { status: 500 }
    );
  }
}

// Удаление пользователя
export async function DELETE(
  request: NextRequest,
  { params }: Context
) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        { error: "Некорректный ID пользователя" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления пользователя:", error);

    return NextResponse.json(
      { error: "Ошибка удаления пользователя" },
      { status: 500 }
    );
  }
}
