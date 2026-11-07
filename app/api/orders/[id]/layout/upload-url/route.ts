
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { randomUUID } from "crypto";

import { getCurrentAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import { createUploadUrl } from "@/lib/r2";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

type RouteContext = {
    params: Promise<{ id: string }>;
};

function sanitizeFilename(filename: string) {
    const basename = filename
        .replace(/\\/g, "/")
        .split("/")
        .pop() || "file";

    return basename
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .replace(/\.\./g, "_")
        .trim()
        .slice(0, 180) || "file";
}

export async function POST(
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

        const originalName =
            typeof body.filename === "string"
                ? body.filename
                : "";

        const contentType =
            typeof body.contentType === "string" &&
                body.contentType.length <= 200
                ? body.contentType
                : "application/octet-stream";

        const size = Number(body.size);

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
                { error: "Размер файла должен быть от 1 байта до 100 МБ" },
                { status: 400 }
            );
        }

        const filename = sanitizeFilename(originalName);
        const storageKey = `order-layouts/${id}/${randomUUID()}-${filename}`;

        const uploadUrl = await createUploadUrl(
            storageKey,
            contentType
        );

        return NextResponse.json({
            uploadUrl,
            storageKey,
            filename,
            originalName: filename,
            contentType,
            size,
        });
    } catch (error) {
        console.error("POST layout upload-url error:", error);

        return NextResponse.json(
            { error: "Не удалось подготовить загрузку макета" },
            { status: 500 }
        );
    }
}
