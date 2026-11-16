
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import { getCurrentAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import PlOrder from "@/lib/models/PlOrder";
import {
    createDownloadUrl,
    deleteR2Object,
} from "@/lib/r2";

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

// GET — открыть макет PL-заказа
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

        if (!order?.layout) {
            return NextResponse.json(
                { error: "У PL-заказа нет прикреплённого макета" },
                { status: 404 }
            );
        }

        if (
            order.layout.storageProvider === "r2" &&
            order.layout.storageKey
        ) {
            const downloadUrl = await createDownloadUrl(
                order.layout.storageKey
            );

            return NextResponse.redirect(downloadUrl);
        }

        if (order.layout.pathOnDisk) {
            const filePath = getStoredFilePath(
                order.layout.pathOnDisk
            );

            if (!filePath) {
                return NextResponse.json(
                    { error: "Некорректный путь к файлу" },
                    { status: 400 }
                );
            }

            const file = await fs.readFile(filePath);

            const filename =
                order.layout.originalName ||
                order.layout.filename ||
                "layout";

            return new NextResponse(new Uint8Array(file), {
                headers: {
                    "Content-Type":
                        order.layout.mimeType ||
                        "application/octet-stream",
                    "Content-Disposition":
                        `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
                    "Content-Length": String(file.length),
                    "Cache-Control": "private, no-store",
                    "X-Content-Type-Options": "nosniff",
                },
            });
        }

        return NextResponse.json(
            { error: "Файл макета не найден" },
            { status: 404 }
        );
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

        console.error("GET PL order layout error:", error);

        return NextResponse.json(
            { error: "Не удалось открыть макет" },
            { status: 500 }
        );
    }
}

// POST — старая загрузка отключена
export async function POST() {
    return NextResponse.json(
        {
            error: "Используй загрузку макета через Cloudflare R2",
        },
        { status: 410 }
    );
}

// DELETE — удалить макет PL-заказа
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

        order.set("layout", undefined);
        await order.save();

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
                        "Не удалось удалить старый макет PL-заказа:",
                        error
                    );
                }
            });
        }

        return NextResponse.json({
            message: "Макет PL-заказа удалён",
        });
    } catch (error) {
        console.error("DELETE PL order layout error:", error);

        return NextResponse.json(
            { error: "Не удалось удалить макет PL-заказа" },
            { status: 500 }
        );
    }
}
