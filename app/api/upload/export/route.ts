import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";

function getSafeSheetName(name: string, usedNames: Set<string>): string {
    const baseName = (name || "Без категории")
        .replace(/[\\/?*[\]:]/g, "_")
        .slice(0, 31);

    let result = baseName;
    let counter = 1;

    while (usedNames.has(result.toLowerCase())) {
        const suffix = `_${counter++}`;
        result = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
    }

    usedNames.add(result.toLowerCase());

    return result;
}

export async function GET() {
    try {
        await connectDB();

        const products = await Product.find().lean();

        if (!products.length) {
            return NextResponse.json(
                { error: "Нет товаров для экспорта" },
                { status: 404 }
            );
        }

        const categories: Record<string, Record<string, unknown>[]> = {};

        for (const product of products) {
            const category = product.category || "Без категории";

            if (!categories[category]) {
                categories[category] = [];
            }

            const row: Record<string, unknown> = {
                Наименование: product.name || "",
                Валюта: product.currency || "",
            };

            for (const priceEntry of product.price || []) {
                row[`От ${priceEntry.minQty} шт`] = priceEntry.price;
            }

            Object.assign(row, {
                Описание: product.description || "",
                Теги: Array.isArray(product.tags)
                    ? product.tags.join(", ")
                    : "",
                "Тип товаров": product.type || "",
                Вес: product.weight || "",
                Цвет: product.color || "",
                "Метод нанесения": product.appMethod || "",
                Материал: product.material || "",
                "Донная складка": product.bottom ? "Да" : "",
                "Усиленная ручка": product.handle ? "Да" : "",
                "Цвет ручек": product.handleColor || "",
                Плотность: product.density || "",
                Размер: product.size || "",
                "Карман для документов": product.docsPocket ? "Да" : "",
                "Липкий клапан": product.stickyAss ? "Да" : "",
                Окно: product.window ? "Да" : "",
                "Zip-замок": product.zipLock ? "Да" : "",
                Изображения: Array.isArray(product.images)
                    ? product.images.join(", ")
                    : "",
                Подкатегория: product.subcategory || "",
            });

            categories[category].push(row);
        }

        const workbook = XLSX.utils.book_new();
        const usedNames = new Set<string>();

        for (const [category, rows] of Object.entries(categories)) {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const sheetName = getSafeSheetName(category, usedNames);

            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }

        const buffer = XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
        });

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition":
                    'attachment; filename="products_export.xlsx"',
                "Content-Length": String(buffer.length),
            },
        });
    } catch (error) {
        console.error("Ошибка при экспорте Excel:", error);

        return NextResponse.json(
            { error: "Ошибка при экспорте товаров" },
            { status: 500 }
        );
    }
}