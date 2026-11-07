
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import * as XLSX from "xlsx";
import { getCurrentAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";
import {
    ensurePatternsDir,
    getPatternPath,
    isExcelFile,
} from "@/lib/patterns";

interface PrintOption {
    code: string;
    quantity: number;
    price: number;
}

// Нормализация названия категории на стороне TypeScript
function normalizeCategory(value: string): string {
    return value
        .normalize("NFC")
        .replace(/[\u2018\u2019\u02BC\uFF07]/g, "'")
        .replace(/[\u00A0\u202F]/g, " ")
        .trim();
}

// Нормализация поля category непосредственно в MongoDB
function getNormalizedCategoryExpression() {
    let expression: any = "$category";

    // Различные варианты апострофа приводим к обычному '
    for (const apostrophe of ["’", "‘", "ʼ", "＇"]) {
        expression = {
            $replaceAll: {
                input: expression,
                find: apostrophe,
                replacement: "'",
            },
        };
    }

    // Неразрывные пробелы приводим к обычным
    for (const space of ["\u00A0", "\u202F"]) {
        expression = {
            $replaceAll: {
                input: expression,
                find: space,
                replacement: " ",
            },
        };
    }

    return {
        $trim: {
            input: expression,
        },
    };
}

export async function POST(request: NextRequest) {
    try {
        const admin = await getCurrentAdmin();

        if (!admin) {
            return NextResponse.json(
                { error: "Необходима авторизация" },
                { status: 401 }
            );
        }

        const body = await request.json();

        const category =
            typeof body.category === "string"
                ? body.category.trim()
                : "";

        const filename =
            typeof body.filename === "string"
                ? body.filename.trim()
                : "";

        const isAllCategories = category === "Все";

        if (!category || !filename) {
            return NextResponse.json(
                { error: "Не указана категория или имя файла" },
                { status: 400 }
            );
        }

        if (!isExcelFile(filename)) {
            return NextResponse.json(
                { error: "Разрешены только файлы .xlsx и .xls" },
                { status: 400 }
            );
        }

        await ensurePatternsDir();

        const filePath = getPatternPath(filename);

        let buffer: Buffer;

        try {
            buffer = await fs.readFile(filePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return NextResponse.json(
                    { error: "Файл шаблона не найден" },
                    { status: 404 }
                );
            }

            throw error;
        }

        // Читаем Excel
        const workbook = XLSX.read(buffer, { type: "buffer" });

        if (!workbook.SheetNames.length) {
            return NextResponse.json(
                { error: "В Excel-файле отсутствуют листы" },
                { status: 400 }
            );
        }

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet || !worksheet["!ref"]) {
            return NextResponse.json(
                { error: "Первый лист Excel пустой" },
                { status: 400 }
            );
        }

        const range = XLSX.utils.decode_range(worksheet["!ref"]);

        // Количества из первой строки
        const quantities: { col: number; quantity: number }[] = [];

        for (let col = 1; col <= range.e.c; col++) {
            const cellRef = XLSX.utils.encode_cell({
                c: col,
                r: 0,
            });

            const cell = worksheet[cellRef];

            if (
                !cell ||
                cell.v === undefined ||
                cell.v === null ||
                cell.v === ""
            ) {
                continue;
            }

            const quantity = Number(String(cell.v).trim());

            if (!Number.isInteger(quantity) || quantity <= 0) {
                return NextResponse.json(
                    {
                        error: `Некорректное количество в ячейке ${cellRef}. Требуется положительное целое число.`,
                    },
                    { status: 400 }
                );
            }

            quantities.push({ col, quantity });
        }

        if (!quantities.length) {
            return NextResponse.json(
                { error: "В первой строке не найдены количества" },
                { status: 400 }
            );
        }

        // Коды печати и цены
        const printOptions: PrintOption[] = [];

        for (let row = 1; row <= range.e.r; row++) {
            const codeCellRef = XLSX.utils.encode_cell({
                c: 0,
                r: row,
            });

            const codeCell = worksheet[codeCellRef];

            if (
                !codeCell ||
                codeCell.v === undefined ||
                codeCell.v === null ||
                String(codeCell.v).trim() === ""
            ) {
                continue;
            }

            const code = String(codeCell.v).trim();

            if (!/^\d+[x+]\d+$/.test(code)) {
                return NextResponse.json(
                    {
                        error: `Некорректный код печати "${code}" в ячейке ${codeCellRef}. Ожидаемый формат: 2x2 или 1+0.`,
                    },
                    { status: 400 }
                );
            }

            for (const { col, quantity } of quantities) {
                const priceCellRef = XLSX.utils.encode_cell({
                    c: col,
                    r: row,
                });

                const priceCell = worksheet[priceCellRef];

                if (
                    !priceCell ||
                    priceCell.v === undefined ||
                    priceCell.v === null ||
                    String(priceCell.v).trim() === ""
                ) {
                    continue;
                }

                const price = Number(
                    String(priceCell.v).trim().replace(",", ".")
                );

                if (!Number.isFinite(price) || price < 0) {
                    return NextResponse.json(
                        {
                            error: `Некорректная цена в ячейке ${priceCellRef}. Цена должна быть числом не меньше 0.`,
                        },
                        { status: 400 }
                    );
                }

                printOptions.push({
                    code,
                    quantity,
                    price,
                });
            }
        }

        if (!printOptions.length) {
            return NextResponse.json(
                { error: "Не удалось извлечь цены из Excel-файла" },
                { status: 400 }
            );
        }

        // Подключаем MongoDB
        await connectDB();

        // Нормализуем категорию из запроса
        const normalizedCategory = normalizeCategory(category);

        // Формируем условие поиска с нормализацией категории в MongoDB
        const categoryFilter = isAllCategories
            ? {}
            : {
                $expr: {
                    $eq: [
                        getNormalizedCategoryExpression(),
                        normalizedCategory,
                    ],
                },
            };
        // Проверяем наличие товаров
        const productsCount = await Product.countDocuments(categoryFilter);

        if (productsCount === 0) {
            return NextResponse.json(
                {
                    error: `В категории "${category}" не найдено товаров. Проверьте название категории в базе данных.`,
                },
                { status: 404 }
            );
        }

        // Полностью заменяем printOptions у всех найденных товаров
        const result = await Product.updateMany(
            categoryFilter,
            {
                $set: {
                    printOptions,
                },
            },
            {
                runValidators: true,
            }
        );

        return NextResponse.json({
            message: isAllCategories
                ? `Цены на печать обновлены для ${result.modifiedCount} товаров во всех категориях`
                : `Цены на печать обновлены для ${result.modifiedCount} товаров категории "${category}"`,
            updatedCount: result.modifiedCount,
            printOptions,
        });
    } catch (error) {
        console.error("Ошибка обновления цен печати:", error);

        return NextResponse.json(
            {
                error: "Ошибка при обработке Excel-файла или обновлении базы данных",
            },
            { status: 500 }
        );
    }
}
