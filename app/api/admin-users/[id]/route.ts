import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import AdminUser from "@/lib/models/AdminUser";
import { getCurrentAdmin } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Некорректный ID сотрудника" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { message: "Некорректный статус" },
        { status: 400 }
      );
    }

    await connectDB();

    const targetUser = await AdminUser.findById(id);

    if (!targetUser) {
      return NextResponse.json(
        { message: "Сотрудник не найден" },
        { status: 404 }
      );
    }

    // Нельзя заблокировать собственную учётную запись
    if (
      String(targetUser._id) === currentAdmin.id &&
      body.isActive === false
    ) {
      return NextResponse.json(
        { message: "Нельзя заблокировать собственную учётную запись" },
        { status: 400 }
      );
    }

    // Нельзя заблокировать последнего активного администратора
    if (
      targetUser.role === "admin" &&
      targetUser.isActive &&
      body.isActive === false
    ) {
      const activeAdmins = await AdminUser.countDocuments({
        role: "admin",
        isActive: true,
      });

      if (activeAdmins <= 1) {
        return NextResponse.json(
          { message: "Нельзя заблокировать последнего активного администратора" },
          { status: 400 }
        );
      }
    }

    targetUser.isActive = body.isActive;
    await targetUser.save();

    return NextResponse.json({
      message: body.isActive
        ? "Сотрудник активирован"
        : "Сотрудник заблокирован",
      user: {
        id: String(targetUser._id),
        name: targetUser.name,
        login: targetUser.login,
        role: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (error) {
    console.error("Update admin user error:", error);

    return NextResponse.json(
      { message: "Ошибка изменения статуса сотрудника" },
      { status: 500 }
    );
  }
}