    import { NextRequest, NextResponse } from "next/server";
    import { connectDB } from "@/lib/db";
    import PlOrder from "@/lib/models/PlOrder";
    import { getCurrentAdmin } from "@/lib/auth";

    export async function GET(request: NextRequest) {
        try {
            const admin = await getCurrentAdmin();

            if (!admin) {
                return NextResponse.json(
                    { error: "Необходима авторизация" },
                    { status: 401 }
                );
            }

            await connectDB();

            const { searchParams } = new URL(request.url);

            const page = Math.max(
                1,
                Number(searchParams.get("page")) || 1
            );

            const limit = Math.min(
                100,
                Math.max(1, Number(searchParams.get("limit")) || 20)
            );

            const paymentStatus =
                searchParams.get("paymentStatus") || "all";

            const search =
                searchParams.get("search")?.trim() || "";

            const filter: Record<string, unknown> = {};

            if (paymentStatus !== "all") {
                filter.paymentStatus = paymentStatus;
            }

            if (search) {
                const escapedSearch = search.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

                const regex = new RegExp(escapedSearch, "i");

                const searchConditions: Record<string, unknown>[] = [
                    { "client.name": regex },
                    { "client.email": regex },
                    { "client.phone": regex },
                    { "shipping.city": regex },
                    { "shipping.address": regex },
                    { "items.name": regex },
                ];

                if (/^[a-f\d]{24}$/i.test(search)) {
                    searchConditions.push({ _id: search });
                }

                filter.$or = searchConditions;
            }

            const skip = (page - 1) * limit;

            const [orders, total] = await Promise.all([
                PlOrder.find(filter)
                    .sort({ createdAt: -1, _id: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),

                PlOrder.countDocuments(filter),
            ]);

            return NextResponse.json({
                orders,
                total,
                page,
                limit,
                hasMore: skip + orders.length < total,
            });
        } catch (error) {
            console.error("GET /api/pl-orders:", error);

            return NextResponse.json(
                { error: "Ошибка получения PL-заказов" },
                { status: 500 }
            );
        }
    }