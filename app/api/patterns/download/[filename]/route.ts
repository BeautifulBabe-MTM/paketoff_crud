
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import {
  ensurePatternsDir,
  getPatternPath,
  isExcelFile,
} from "@/lib/patterns";
import { getCurrentAdmin } from "@/lib/auth";

interface RouteContext {
  params: Promise<{
    filename: string;
  }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }
    const { filename } = await context.params;

    if (!isExcelFile(filename)) {
      return NextResponse.json(
        { error: "Некорректный файл" },
        { status: 400 }
      );
    }

    await ensurePatternsDir();

    const filePath = getPatternPath(filename);
    const buffer = await fs.readFile(filePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      return NextResponse.json(
        { error: "Файл не найден" },
        { status: 404 }
      );
    }

    console.error("Ошибка скачивания шаблона:", error);

    return NextResponse.json(
      { error: "Не удалось скачать файл" },
      { status: 500 }
    );
  }
}
