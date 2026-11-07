import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getCurrentAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";

const STORAGE_DIR = path.join(
    process.cwd(),
    "storage",
    "order-layouts"
);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

type RouteContext = {
    params: Promise<{ id: string }>;
};

function isValidId(id: string) {
    return mongoose.Types.ObjectId.isValid(id);
}

function getSafeFilename(name: string) {
    const basename = name
        .replace(/\\/g, "/")
        .split("/")
        .pop() ?? "file";

    return basename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function getStoredFilePath(filePath?: string) {
    if (!filePath) return null;

    const resolvedPath = path.resolve(filePath);
    const relativePath = path.relative(STORAGE_DIR, resolvedPath);

    if (
        relativePath.startsWith("..") ||
        path.isAbsolute(relativePath) ||
        relativePath === ""
    ) {
        return null;
    }

    return resolvedPath;
}

// GET — открыть или скачать макет
export async function GET(
    _request: NextRequest,
    { params }: RouteContext,
    
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

        if (!order.layout?.pathOnDisk) {
            return NextResponse.json(
                { error: "У заказа нет прикреплённого макета" },
                { status: 404 }
            );
        }

        const filePath = getStoredFilePath(order.layout.pathOnDisk);

        if (!filePath) {
            return NextResponse.json(
                { error: "Некорректный путь к файлу" },
                { status: 400 }
            );
        }

        const file = await fs.readFile(filePath);
        const filename = order.layout.originalName || order.layout.filename || "layout";

        return new NextResponse(new Uint8Array(file), {
            headers: {
                "Content-Type": order.layout.mimeType || "application/octet-stream",
                "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
                "Content-Length": String(file.length),
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return NextResponse.json(
                { error: "Файл макета не найден на диске" },
                { status: 404 }
            );
        }

        console.error("GET order layout error:", error);

        return NextResponse.json(
            { error: "Не удалось открыть макет" },
            { status: 500 }
        );
    }
}

// POST — загрузить новый макет или заменить существующий
export async function POST(
    request: NextRequest,
    { params }: RouteContext
) {
    let newFilePath: string | null = null;

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

        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json(
                { error: "Выбери файл для загрузки" },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Размер файла не должен превышать 100 МБ" },
                { status: 400 }
            );
        }

        await fs.mkdir(STORAGE_DIR, { recursive: true });

        const originalName = getSafeFilename(file.name);
        const filename = `${Date.now()}-${randomUUID()}-${originalName}`;

        newFilePath = path.join(STORAGE_DIR, filename);

        const buffer = Buffer.from(await file.arrayBuffer());

        await fs.writeFile(newFilePath, buffer);

        const oldFilePath = getStoredFilePath(
            order.layout?.pathOnDisk
        );

        order.layout = {
            filename,
            originalName,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            pathOnDisk: newFilePath,
            path: `/api/orders/${id}/layout`,
        };

        await order.save();

        // Старый файл удаляем только после успешного сохранения нового.
        if (oldFilePath && oldFilePath !== newFilePath) {
            await fs.unlink(oldFilePath).catch((error) => {
                if (error.code !== "ENOENT") {
                    console.error("Не удалось удалить старый макет:", error);
                }
            });
        }

        return NextResponse.json({
            message: "Макет успешно загружен",
            layout: order.layout,
        });
    } catch (error) {
        // Если сохранение в MongoDB не удалось, убираем новый файл.
        if (newFilePath) {
            await fs.unlink(newFilePath).catch(() => { });
        }

        console.error("POST order layout error:", error);

        return NextResponse.json(
            { error: "Не удалось загрузить макет" },
            { status: 500 }
        );
    }
}

// DELETE — удалить прикреплённый макет
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

        const oldFilePath = getStoredFilePath(
            order.layout?.pathOnDisk
        );

        order.set("layout", undefined);
        await order.save();

        if (oldFilePath) {
            await fs.unlink(oldFilePath).catch((error) => {
                if (error.code !== "ENOENT") {
                    console.error("Не удалось удалить макет:", error);
                }
            });
        }

        return NextResponse.json({
            message: "Макет удалён",
        });
    } catch (error) {
        console.error("DELETE order layout error:", error);

        return NextResponse.json(
            { error: "Не удалось удалить макет" },
            { status: 500 }
        );
    }
}