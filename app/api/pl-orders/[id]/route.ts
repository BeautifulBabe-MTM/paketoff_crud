
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import { getCurrentAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import PlOrder from "@/lib/models/PlOrder";
import { deleteR2Object } from "@/lib/r2";

const STORAGE_DIR = path.join(
    process.cwd(),
    "storage",
    "order-layouts"
);

type RouteContext = {
    params: Promise<{ id: string }>;
};

function isValidId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
}

function getStoredFilePath(filePath?: string) {
    if (!filePath) return null;

    const resolvedPath = path.resolve(filePath);
    const relativePath = path.relative(
        STORAGE_DIR,
        resolvedPath
    );

    if (
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath) ||
        relativePath === ""
    ) {
        return null;
    }

    return resolvedPath;
}

export async function GET(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        const admin = await getCurrentAdmin();

        if (!admin) {
            return NextResponse.json(
                { error: "Необходима авторизация" },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidId(id)) {
            return NextResponse.json(
                { error: "Некорректный ID PL-заказа" },
                { status: 400 }
            );
        }

        await connectDB();

        const order = await PlOrder.findById(id).lean();

        if (!order) {
            return NextResponse.json(
                { error: "PL-заказ не найден" },
                { status: 404 }
            );
        }

        return NextResponse.json({ order });
    } catch (error) {
        console.error("GET /api/pl-orders/[id]:", error);

        return NextResponse.json(
            { error: "Не удалось получить PL-заказ" },
            { status: 500 }
        );
    }
}

// PUT — обновить PL-заказ
export async function PUT(
    request: NextRequest,
    { params }: RouteContext
) {
    try {
        const admin = await getCurrentAdmin();

        if (!admin) {
            return NextResponse.json(
                { error: "Необходима авторизация" },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidId(id)) {
            return NextResponse.json(
                { error: "Некорректный ID PL-заказа" },
                { status: 400 }
            );
        }

        const body = await request.json();

        await connectDB();

        const order = await PlOrder.findById(id);

        if (!order) {
            return NextResponse.json(
                { error: "PL-заказ не найден" },
                { status: 404 }
            );
        }

        // Клиент
        if (body.client !== undefined) {
            if (
                !body.client ||
                typeof body.client !== "object" ||
                Array.isArray(body.client)
            ) {
                return NextResponse.json(
                    { error: "Некорректные данные клиента" },
                    { status: 400 }
                );
            }

            order.client = {
                name: String(body.client.name ?? ""),
                phone: String(body.client.phone ?? ""),
                email: String(body.client.email ?? ""),
            };
        }

        // Доставка
        if (body.shipping !== undefined) {
            if (
                !body.shipping ||
                typeof body.shipping !== "object" ||
                Array.isArray(body.shipping)
            ) {
                return NextResponse.json(
                    { error: "Некорректные данные доставки" },
                    { status: 400 }
                );
            }

            order.shipping = {
                country: String(body.shipping.country ?? ""),
                city: String(body.shipping.city ?? ""),
                address: String(body.shipping.address ?? ""),
                zip: String(body.shipping.zip ?? ""),
            };
        }

        // Товары
        if (body.items !== undefined) {
            if (!Array.isArray(body.items)) {
                return NextResponse.json(
                    { error: "Список товаров должен быть массивом" },
                    { status: 400 }
                );
            }

            const invalidItem = body.items.some((item: any) => {
                return (
                    !item ||
                    typeof item !== "object" ||
                    !Number.isFinite(Number(item.quantity)) ||
                    !Number.isFinite(Number(item.total))
                );
            });

            if (invalidItem) {
                return NextResponse.json(
                    { error: "Некорректные данные товаров" },
                    { status: 400 }
                );
            }

            order.items = body.items.map((item: any) => ({
                productId: String(item.productId ?? ""),
                name: String(item.name ?? ""),
                size: String(item.size ?? ""),
                print: String(item.print ?? ""),
                quantity: Number(item.quantity),
                total: Number(item.total),
            }));
        }

        // Способ оплаты
        if (body.paymentMethod !== undefined) {
            order.paymentMethod = String(body.paymentMethod);
        }

        // Статус оплаты / выполнения
        if (body.paymentStatus !== undefined) {
            order.paymentStatus = String(body.paymentStatus);
        }

        // Общая сумма
        if (body.totalSum !== undefined) {
            const totalSum = Number(body.totalSum);

            if (!Number.isFinite(totalSum) || totalSum < 0) {
                return NextResponse.json(
                    { error: "Некорректная сумма заказа" },
                    { status: 400 }
                );
            }

            order.totalSum = totalSum;
        }

        // Валюта
        if (body.currency !== undefined) {
            order.currency = String(body.currency);
        }

        // Язык
        if (body.locale !== undefined) {
            order.locale = String(body.locale);
        }

        // Комментарий
        if (body.comment !== undefined) {
            order.comment = String(body.comment);
        }

        order.updatedAt = new Date();

        await order.save();

        return NextResponse.json({
            message: "PL-заказ успешно обновлён",
            order,
        });
    } catch (error) {
        console.error("PUT /api/pl-orders/[id]:", error);

        return NextResponse.json(
            { error: "Не удалось обновить PL-заказ" },
            { status: 500 }
        );
    }
}

// DELETE — удалить PL-заказ
export async function DELETE(
    _request: NextRequest,
    { params }: RouteContext
) {
    try {
        const admin = await getCurrentAdmin();

        if (!admin) {
            return NextResponse.json(
                { error: "Необходима авторизация" },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidId(id)) {
            return NextResponse.json(
                { error: "Некорректный ID PL-заказа" },
                { status: 400 }
            );
        }

        await connectDB();

        const order = await PlOrder.findById(id);

        if (!order) {
            return NextResponse.json(
                { error: "PL-заказ не найден" },
                { status: 404 }
            );
        }

        const storageKey = order.layout?.storageKey;

        const oldFilePath = getStoredFilePath(
            order.layout?.pathOnDisk
        );

        // Сначала удаляем заказ из MongoDB
        await PlOrder.findByIdAndDelete(id);

        // Удаляем макет из Cloudflare R2
        if (storageKey) {
            try {
                await deleteR2Object(storageKey);
            } catch (error) {
                console.error(
                    "Не удалось удалить макет PL-заказа из R2:",
                    error
                );
            }
        }

        if (oldFilePath) {
            await fs.unlink(oldFilePath).catch((error) => {
                if (
                    error instanceof Error &&
                    "code" in error &&
                    error.code !== "ENOENT"
                ) {
                    console.error(
                        "Не удалось удалить локальный макет PL-заказа:",
                        error
                    );
                }
            });
        }

        return NextResponse.json({
            message: "PL-заказ успешно удалён",
        });
    } catch (error) {
        console.error("DELETE /api/pl-orders/[id]:", error);

        return NextResponse.json(
            { error: "Не удалось удалить PL-заказ" },
            { status: 500 }
        );
    }
}
