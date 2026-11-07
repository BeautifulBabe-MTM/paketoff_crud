import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import { getCurrentAdmin } from "@/lib/auth";

// Получение списка сотрудников
export async function GET() {
  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { message: "Необходима авторизация" },
        { status: 401 }
      );
    }

    if (currentAdmin.role !== "admin") {
      return NextResponse.json(
        { message: "Недостаточно прав" },
        { status: 403 }
      );
    }

    await connectDB();

    const users = await AdminUser.find()
      .select("_id name login role isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get admin users error:", error);

    return NextResponse.json(
      { message: "Ошибка получения сотрудников" },
      { status: 500 }
    );
  }
}

// Создание нового сотрудника
export async function POST(request: NextRequest) {
  try {
    const currentAdmin = await getCurrentAdmin();

    if (!currentAdmin) {
      return NextResponse.json(
        { message: "Необходима авторизация" },
        { status: 401 }
      );
    }

    if (currentAdmin.role !== "admin") {
      return NextResponse.json(
        { message: "Недостаточно прав" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const login =
      typeof body.login === "string"
        ? body.login.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    const role = body.role;

    if (!name || !login || !password || !role) {
      return NextResponse.json(
        { message: "Заполните все поля" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { message: "Имя слишком длинное" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(login)) {
      return NextResponse.json(
        {
          message:
            "Логин должен содержать 3–30 символов: латиницу, цифры, точку, дефис или подчёркивание",
        },
        { status: 400 }
      );
    }

    if (password.length < 12 || password.length > 128) {
      return NextResponse.json(
        { message: "Пароль должен содержать от 12 до 128 символов" },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { message: "Недопустимая роль" },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await AdminUser.findOne({ login });

    if (existingUser) {
      return NextResponse.json(
        { message: "Такой логин уже занят" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await AdminUser.create({
      name,
      login,
      password: hashedPassword,
      role,
      isActive: true,
    });

    return NextResponse.json(
      {
        message: "Сотрудник успешно создан",
        user: {
          id: String(newUser._id),
          name: newUser.name,
          login: newUser.login,
          role: newUser.role,
          isActive: newUser.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create admin user error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { message: "Такой логин уже существует" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Ошибка создания сотрудника" },
      { status: 500 }
    );
  }
}