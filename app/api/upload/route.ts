import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";

function getString(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function getBoolean(value: unknown): boolean {
    const normalized = getString(value).toLowerCase();

    return ["да", "так", "yes", "true", "1"].includes(normalized);
}

function getTags(value: unknown): string[] {
    const text = getString(value);

    if (!text) return [];

    return text
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function getImages(value: unknown): string[] {
    const text = getString(value);

    if (!text) return [];

    return text
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);
}

function getPrices(row: Record<string, unknown>) {
    const prices: { minQty: number; price: number }[] = [];

    for (const key of Object.keys(row)) {
        const match = key.match(/^От\s+(\d+)\s+шт$/i);

        if (!match) continue;

        const minQty = Number.parseInt(match[1], 10);
        const price = Number(row[key]);

        if (
            Number.isInteger(minQty) &&
            minQty >= 1 &&
            Number.isFinite(price) &&
            price >= 0
        ) {
            prices.push({ minQty, price });
        }
    }

    return prices;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "Файл не надіслано" },
                { status: 400 }
            );
        }

        const extension = file.name.split(".").pop()?.toLowerCase();

        if (!["xlsx", "xls"].includes(extension || "")) {
            return NextResponse.json(
                { error: "Підтримуються лише файли XLS та XLSX" },
                { status: 400 }
            );
        }

        if (file.size > 25 * 1024 * 1024) {
            return NextResponse.json(
                { error: "Максимальный размер файла — 25 МБ" },
                { status: 400 }
            );
        }

        await connectDB();

        const buffer = Buffer.from(await file.arrayBuffer());

        const workbook = XLSX.read(buffer, {
            type: "buffer",
        });

        if (!workbook.SheetNames.length) {
            return NextResponse.json(
                { error: "В Excel-файле нет листов" },
                { status: 400 }
            );
        }

        // Сначала полностью разбираем и проверяем файл.
        // До окончания проверки существующие товары не удаляются.
        const preparedCategories: {
            category: string;
            products: Record<string, unknown>[];
        }[] = [];

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];

            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
                worksheet,
                { defval: "" }
            );

            const products: Record<string, unknown>[] = [];

            for (let index = 0; index < rows.length; index++) {
                const row = rows[index];

                const product = {
                    name: getString(row["Наименование"]) || "Без назви",
                    category: sheetName,
                    subcategory: getString(row["Подкатегория"]) || null,
                    currency: getString(row["Валюта"]),
                    price: getPrices(row),
                    description: getString(row["Описание"]),
                    tags: getTags(row["Теги"]),
                    type: getString(row["Тип товаров"]),
                    weight: getString(row["Вес"]),
                    color: getString(row["Цвет"]),
                    appMethod: getString(row["Метод нанесения"]),
                    material: getString(row["Материал"]),
                    bottom: getBoolean(row["Донная складка"]),
                    handle: getBoolean(row["Усиленная ручка"]),
                    handleColor: getString(row["Цвет ручек"]),
                    density: getString(row["Плотность"]),
                    size: getString(row["Размер"]),
                    docsPocket: getBoolean(row["Карман для документов"]),
                    stickyAss: getBoolean(row["Липкий клапан"]),
                    window: getBoolean(row["Окно"]),
                    zipLock: getBoolean(row["Zip-замок"]),
                    images: getImages(row["Изображения"]),
                    printOptions: [],
                };

                const missingFields: string[] = [];

                if (!product.name) missingFields.push("Наименование");
                if (!product.currency) missingFields.push("Валюта");
                if (!product.color) missingFields.push("Цвет");
                if (!product.size) missingFields.push("Размер");

                if (missingFields.length) {
                    return NextResponse.json(
                        {
                            error: `Лист "${sheetName}", строка ${index + 2}: заполните обязательные поля: ${missingFields.join(", ")}`,
                        },
                        { status: 400 }
                    );
                }

                products.push(product);
            }

            preparedCategories.push({
                category: sheetName,
                products,
            });
        }

        // Проверяем документы средствами Mongoose до удаления старых товаров.
        for (const category of preparedCategories) {
            for (let index = 0; index < category.products.length; index++) {
                const product = new Product(category.products[index]);

                try {
                    await product.validate();
                } catch (error) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Ошибка проверки товара";

                    return NextResponse.json(
                        {
                            error: `Лист "${category.category}", строка ${index + 2}: ${message}`,
                        },
                        { status: 400 }
                    );
                }
            }
        }

        // Все данные проверены. Теперь заменяем товары по категориям.
        let added = 0;

        for (const category of preparedCategories) {
            await Product.deleteMany({
                category: category.category,
            });

            if (category.products.length > 0) {
                await Product.insertMany(category.products);
                added += category.products.length;
            }
        }

        return NextResponse.json({
            success: true,
            added,
            fileName: file.name,
        });
    } catch (error) {
        console.error("Ошибка при обработке Excel:", error);

        return NextResponse.json(
            { error: "Ошибка при обработке файла" },
            { status: 500 }
        );
    }
}