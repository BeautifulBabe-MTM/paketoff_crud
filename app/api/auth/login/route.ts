import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import { createToken, setAuthCookie, AuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const login =
      typeof body.login === "string"
        ? body.login.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!login || !password) {
      return NextResponse.json(
        { message: "Введите логин и пароль" },
        { status: 400 }
      );
    }

    await connectDB();

    const admin = await AdminUser.findOne({ login }).select("+password");

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { message: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      admin.password
    );

    if (!passwordValid) {
      return NextResponse.json(
        { message: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const user: AuthUser = {
      id: String(admin._id),
      name: admin.name,
      login: admin.login,
      role: admin.role,
    };

    const token = await createToken(user);

    await setAuthCookie(token);

    return NextResponse.json({
      message: "Авторизация успешна",
      user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { message: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}