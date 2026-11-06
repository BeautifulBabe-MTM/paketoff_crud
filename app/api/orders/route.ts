import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);

        const page = Math.max(1, Number(searchParams.get("page")) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number(searchParams.get("limit")) || 20)
        );

        const status = searchParams.get("status") || "all";
        const search = searchParams.get("search")?.trim() || "";

        const filter: Record<string, unknown> = {};

        if (status !== "all") {
            filter.status = status;
        }

        if (search) {
            const escapedSearch = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const regex = new RegExp(escapedSearch, "i");

            const searchConditions: Record<string, unknown>[] = [
                { "contact.name": regex },
                { "contact.email": regex },
                { "contact.phone": regex },
            ];

            if (/^[a-f\d]{24}$/i.test(search)) {
                searchConditions.push({ _id: search });
            }

            filter.$or = searchConditions;
        }

        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1, _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Order.countDocuments(filter),
        ]);

        return NextResponse.json({
            orders,
            total,
            page,
            limit,
            hasMore: skip + orders.length < total,
        });
    } catch (error) {
        console.error("GET /api/orders:", error);

        return NextResponse.json(
            { error: "Ошибка получения заказов" },
            { status: 500 }
        );
    }
}