
import { NextResponse } from "next/server";
import fs from "fs/promises";
import { ensurePatternsDir, patternsDir } from "@/lib/patterns";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { error: "Необходима авторизация" },
        { status: 401 }
      );
    }
    await ensurePatternsDir();

    const entries = await fs.readdir(patternsDir, {
      withFileTypes: true,
    });

    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Ошибка получения списка шаблонов:", error);

    return NextResponse.json(
      { error: "Не удалось прочитать папку patterns" },
      { status: 500 }
    );
  }
}
