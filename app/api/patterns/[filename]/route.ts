
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import {
  ensurePatternsDir,
  getPatternPath,
  isSafeFilename,
  isExcelFile,
} from "@/lib/patterns";

// Удаление шаблона
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    // Проверяем имя и расширение файла
    if (!isSafeFilename(filename) || !isExcelFile(filename)) {
      return NextResponse.json(
        { error: "Некорректное имя файла" },
        { status: 400 }
      );
    }

    await ensurePatternsDir();

    const filePath = getPatternPath(filename);

    // Удаляем файл
    await fs.unlink(filePath);

    return NextResponse.json({
      message: `Шаблон "${filename}" успешно удалён`,
    });
  } catch (error) {
    console.error("Ошибка удаления шаблона:", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return NextResponse.json(
        { error: "Шаблон не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Не удалось удалить шаблон" },
      { status: 500 }
    );
  }
}
