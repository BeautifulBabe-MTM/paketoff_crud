import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: "Некорректный ID заказа" },
                { status: 400 }
            );
        }

        await connectDB();

        const order = await Order.findByIdAndDelete(id);

        if (!order) {
            return NextResponse.json(
                { error: "Заказ не найден" },
                { status: 404 }
            );
        }

        // Удаляем файл макета, если он находится в разрешённой папке.
        if (order.layout?.filename) {
            const uploadDirectory = path.resolve(
                process.cwd(),
                "uploads/order-layouts"
            );

            const filePath = path.resolve(
                uploadDirectory,
                path.basename(order.layout.filename)
            );

            if (path.dirname(filePath) === uploadDirectory) {
                try {
                    await fs.unlink(filePath);
                } catch (error) {
                    const fileError = error as NodeJS.ErrnoException;

                    if (fileError.code !== "ENOENT") {
                        console.error("Ошибка удаления макета:", error);
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/orders:", error);

        return NextResponse.json(
            { error: "Ошибка удаления заказа" },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: "Некорректный ID заказа" },
                { status: 400 }
            );
        }

        await connectDB();

        const order = await Order.findById(id).lean();

        if (!order) {
            return NextResponse.json(
                { error: "Заказ не найден" },
                { status: 404 }
            );
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error("GET /api/orders/[id]:", error);

        return NextResponse.json(
            { error: "Ошибка получения заказа" },
            { status: 500 }
        );
    }
}


export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: "Некорректный ID заказа" },
                { status: 400 }
            );
        }

        const body = await request.json();

        await connectDB();

        const allowedStatuses = [
            "new",
            "processing",
            "shipped",
            "completed",
            "cancelled",
        ];

        if (
            body.status !== undefined &&
            !allowedStatuses.includes(body.status)
        ) {
            return NextResponse.json(
                { error: "Некорректный статус заказа" },
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = {};

        if (body.contact !== undefined) {
            updateData.contact = {
                name: String(body.contact.name ?? ""),
                phone: String(body.contact.phone ?? ""),
                email: String(body.contact.email ?? ""),
            };
        }

        if (body.delivery !== undefined) {
            updateData.delivery = {
                method: String(body.delivery.method ?? ""),
                address: String(body.delivery.address ?? ""),
            };
        }

        if (body.cart !== undefined) {
            if (!Array.isArray(body.cart)) {
                return NextResponse.json(
                    { error: "Некорректная корзина заказа" },
                    { status: 400 }
                );
            }

            updateData.cart = body.cart.map(
                (item: {
                    name?: string;
                    quantity?: number;
                    price?: number;
                }) => ({
                    name: String(item.name ?? ""),
                    quantity: Number(item.quantity ?? 0),
                    price: Number(item.price ?? 0),
                })
            );

            const invalidItem = (
                updateData.cart as {
                    name: string;
                    quantity: number;
                    price: number;
                }[]
            ).some(
                (item) =>
                    !item.name.trim() ||
                    !Number.isFinite(item.quantity) ||
                    item.quantity < 0 ||
                    !Number.isFinite(item.price) ||
                    item.price < 0
            );

            if (invalidItem) {
                return NextResponse.json(
                    { error: "Некорректные данные товаров" },
                    { status: 400 }
                );
            }

            updateData.total = (
                updateData.cart as {
                    quantity: number;
                    price: number;
                }[]
            ).reduce(
                (sum, item) =>
                    sum + item.quantity * item.price,
                0
            );
        }

        if (body.paymentMethod !== undefined) {
            updateData.paymentMethod = String(body.paymentMethod);
        }

        if (body.status !== undefined) {
            updateData.status = body.status;
        }

        if (body.comment !== undefined) {
            updateData.comment = String(body.comment);
        }

        if (body.language !== undefined) {
            updateData.language = String(body.language);
        }

        const order = await Order.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,
                runValidators: true,
            }
        ).lean();

        if (!order) {
            return NextResponse.json(
                { error: "Заказ не найден" },
                { status: 404 }
            );
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error("PUT /api/orders/[id]:", error);

        return NextResponse.json(
            { error: "Ошибка обновления заказа" },
            { status: 500 }
        );
    }
}
