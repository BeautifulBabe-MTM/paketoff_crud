
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getCurrentAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import {
    getR2ObjectInfo,
} from "@/lib/r2";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(
    request: NextRequest,
    { params }: RouteContext
) {
    try {
        // Проверяем администратора
        const admin = await getCurrentAdmin();

        if (!admin) {
            return NextResponse.json(
                { error: "Необходима авторизация" },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json(
                { error: "Некорректный ID заказа" },
                { status: 400 }
            );
        }

        await connectDB();

        const order = await Order.findById(id);

        if (!order) {
            return NextResponse.json(
                { error: "Заказ не найден" },
                { status: 404 }
            );
        }

        const body = await request.json();

        const storageKey =
            typeof body.storageKey === "string"
                ? body.storageKey
                : "";

        const originalName =
            typeof body.filename === "string"
                ? body.filename
                : typeof body.originalName === "string"
                    ? body.originalName
                    : "";

        const contentType =
            typeof body.contentType === "string"
                ? body.contentType
                : "application/octet-stream";

        const size = Number(body.size);

        if (!storageKey.startsWith(`order-layouts/${id}/`)) {
            return NextResponse.json(
                { error: "Некорректный путь к файлу" },
                { status: 400 }
            );
        }

        if (!originalName.trim()) {
            return NextResponse.json(
                { error: "Не указано имя файла" },
                { status: 400 }
            );
        }

        if (
            !Number.isSafeInteger(size) ||
            size <= 0 ||
            size > MAX_FILE_SIZE
        ) {
            return NextResponse.json(
                { error: "Некорректный размер файла" },
                { status: 400 }
            );
        }

        // Проверяем, действительно ли файл существует в R2
        const fileInfo = await getR2ObjectInfo(storageKey);

        if (!fileInfo.ContentLength || fileInfo.ContentLength <= 0) {
            return NextResponse.json(
                { error: "Файл не найден в Cloudflare R2" },
                { status: 400 }
            );
        }

        if (fileInfo.ContentLength !== size) {
            return NextResponse.json(
                { error: "Размер загруженного файла не совпадает" },
                { status: 400 }
            );
        }

        // Сохраняем информацию о файле в заказе
        order.layout = {
            filename: originalName,
            originalName,
            mimeType: contentType,
            size,
            storageKey,
            storageProvider: "r2",
            path: `/api/orders/${id}/layout`,
        } as any;

        await order.save();

        return NextResponse.json({
            success: true,
            message: "Макет успешно сохранён",
            layout: order.layout,
        });

    } catch (error) {
        console.error("POST layout complete error:", error);

        return NextResponse.json(
            { error: "Не удалось подтвердить загрузку макета" },
            { status: 500 }
        );
    }
}
