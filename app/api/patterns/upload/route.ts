
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import {
  ensurePatternsDir,
  getPatternPath,
  sanitizeFilename,
  isExcelFile,
} from "@/lib/patterns";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Файл не был загружен" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Файл пустой" },
        { status: 400 }
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Размер файла не должен превышать 20 МБ" },
        { status: 400 }
      );
    }

    const filename = sanitizeFilename(file.name);

    if (!filename || !isExcelFile(filename)) {
      return NextResponse.json(
        { error: "Разрешены только файлы .xlsx и .xls" },
        { status: 400 }
      );
    }

    await ensurePatternsDir();

    const filePath = getPatternPath(filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      message: "Файл успешно загружен",
      file: filename,
    });
  } catch (error) {
    console.error("Ошибка загрузки шаблона:", error);

    return NextResponse.json(
      { error: "Не удалось загрузить файл" },
      { status: 500 }
    );
  }
}
