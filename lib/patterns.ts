
import path from "path";
import fs from "fs/promises";

// Папка для хранения Excel-шаблонов
export const patternsDir = path.join(
  process.cwd(),
  "storage",
  "patterns"
);

// Создание папки, если она отсутствует
export async function ensurePatternsDir() {
  await fs.mkdir(patternsDir, { recursive: true });
}

// Очистка имени файла от недопустимых символов
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/\.\./g, "_")
    .trim();
}

// Проверка безопасности имени файла
export function isSafeFilename(filename: string): boolean {
  return (
    typeof filename === "string" &&
    filename.length > 0 &&
    filename !== "." &&
    filename !== ".." &&
    path.basename(filename) === filename &&
    !filename.includes("/") &&
    !filename.includes("\\")
  );
}

// Получение полного пути к шаблону
export function getPatternPath(filename: string): string {
  if (!isSafeFilename(filename)) {
    throw new Error("Некорректное имя файла");
  }

  return path.join(patternsDir, filename);
}

// Проверка расширения Excel
export function isExcelFile(filename: string): boolean {
  return /\.(xlsx|xls)$/i.test(filename);
}
