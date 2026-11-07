
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import {
  ensurePatternsDir,
  getPatternPath,
  isExcelFile,
  isSafeFilename,
} from "@/lib/patterns";

export async function PUT(request: NextRequest) {
  try {
    const { oldName, newName } = await request.json();

    if (
      typeof oldName !== "string" ||
      typeof newName !== "string" ||
      !isSafeFilename(oldName) ||
      !isSafeFilename(newName)
    ) {
      return NextResponse.json(
        { error: "Некорректное имя файла" },
        { status: 400 }
      );
    }

    if (!isExcelFile(oldName) || !isExcelFile(newName)) {
      return NextResponse.json(
        { error: "Разрешены только файлы Excel (.xls, .xlsx)" },
        { status: 400 }
      );
    }

    await ensurePatternsDir();

    const oldPath = getPatternPath(oldName);
    const newPath = getPatternPath(newName);

    try {
      await fs.access(oldPath);
    } catch {
      return NextResponse.json(
        { error: "Исходный файл не найден" },
        { status: 404 }
      );
    }

    if (oldName === newName) {
      return NextResponse.json(
        { error: "Новое имя совпадает с текущим" },
        { status: 400 }
      );
    }

    try {
      await fs.access(newPath);

      return NextResponse.json(
        { error: "Файл с таким именем уже существует" },
        { status: 409 }
      );
    } catch {
      // Файл назначения отсутствует — можно переименовывать.
    }

    await fs.rename(oldPath, newPath);

    return NextResponse.json({
      success: true,
      message: "Шаблон успешно переименован",
      oldName,
      newName,
    });
  } catch (error) {
    console.error("Ошибка при переименовании шаблона:", error);

    return NextResponse.json(
      { error: "Не удалось переименовать шаблон" },
      { status: 500 }
    );
  }
}
