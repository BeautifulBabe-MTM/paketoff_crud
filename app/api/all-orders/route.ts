
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { getCurrentAdmin } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import PlOrder from "@/lib/models/PlOrder";

type Source = "all" | "kulek" | "pl";

function escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchConditions(search: string, fields: string[]) {
    if (!search) return [];

    const regex = new RegExp(escapeRegex(search), "i");

    const conditions: Record<string, unknown>[] = fields.map(
        (field) => ({ [field]: regex })
    );

    if (/^[a-f\d]{24}$/i.test(search)) {
        conditions.push({
            _id: new mongoose.Types.ObjectId(search),
        });
    }

    return conditions;
}

function buildFilter(
    searchConditions: Record<string, unknown>[],
    statusConditions: Record<string, unknown>[]
) {
    const conditions: Record<string, unknown>[] = [];

    if (searchConditions.length > 0) {
        conditions.push({ $or: searchConditions });
    }

    if (statusConditions.length > 0) {
        conditions.push({ $or: statusConditions });
    }

    if (conditions.length === 0) return {};

    return { $and: conditions };
}

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

        const source = (
            searchParams.get("source") || "all"
        ) as Source;

        const status = searchParams.get("status") || "all";
        const search = searchParams.get("search")?.trim() || "";

        if (!["all", "kulek", "pl"].includes(source)) {
            return NextResponse.json(
                { error: "Некорректный источник заказов" },
                { status: 400 }
            );
        }

        const normalSearch = buildSearchConditions(search, [
            "contact.name",
            "contact.email",
            "contact.phone",
            "delivery.address",
            "delivery.method",
            "cart.name",
        ]);

        const plSearch = buildSearchConditions(search, [
            "client.name",
            "client.email",
            "client.phone",
            "shipping.city",
            "shipping.address",
            "items.name",
        ]);

        const normalStatuses: Record<string, string[]> = {
            new: ["new"],
            processing: ["processing"],
            shipped: ["shipped"],
            completed: ["completed"],
            cancelled: ["cancelled"],
        };

        const plStatuses: Record<string, string[]> = {
            new: ["NEW"],
            processing: ["PAID", "PREPARING"],
            shipped: ["SHIPPED"],
            completed: ["DELIVERED"],
            cancelled: ["CANCELLED"],
            pending: ["PENDING"],
        };

        let normalStatusConditions: Record<string, unknown>[] = [];
        let plStatusConditions: Record<string, unknown>[] = [];

        if (status !== "all") {
            if (source === "kulek") {
                const values = normalStatuses[status];

                if (!values) {
                    return NextResponse.json(
                        { error: "Некорректный статус заказа" },
                        { status: 400 }
                    );
                }

                normalStatusConditions = [
                    { status: { $in: values } },
                ];
            } else if (source === "pl") {
                const values = plStatuses[status];

                if (!values) {
                    return NextResponse.json(
                        { error: "Некорректный статус PL-заказа" },
                        { status: 400 }
                    );
                }

                plStatusConditions = [
                    { paymentStatus: { $in: values } },
                ];
            } else {
                const normalValues = normalStatuses[status] || [];
                const plValues = plStatuses[status] || [];

                if (!normalValues.length && !plValues.length) {
                    return NextResponse.json(
                        { error: "Некорректный статус заказа" },
                        { status: 400 }
                    );
                }

                normalStatusConditions = normalValues.length
                    ? [{ status: { $in: normalValues } }]
                    : [{ _id: { $exists: false } }];

                plStatusConditions = plValues.length
                    ? [{ paymentStatus: { $in: plValues } }]
                    : [{ _id: { $exists: false } }];
            }
        }

        const normalFilter = buildFilter(
            normalSearch,
            normalStatusConditions
        );

        const plFilter = buildFilter(
            plSearch,
            plStatusConditions
        );

        const skip = (page - 1) * limit;

        const pipeline: mongoose.PipelineStage[] = [
            {
                $match: source === "pl"
                    ? { _id: { $exists: false } }
                    : normalFilter,
            },
            {
                $addFields: {
                    source: "kulek",
                },
            },
            {
                $unionWith: {
                    coll: "pl_orders",
                    pipeline: [
                        {
                            $match: source === "kulek"
                                ? { _id: { $exists: false } }
                                : plFilter,
                        },
                        {
                            $addFields: {
                                source: "pl",
                            },
                        },
                    ],
                },
            },
            {
                $facet: {
                    orders: [
                        { $sort: { createdAt: -1, _id: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    total: [
                        { $count: "count" },
                    ],
                },
            },
        ];

        const [result] = await Order.aggregate(pipeline);

        const orders = result?.orders || [];
        const total = result?.total?.[0]?.count || 0;

        return NextResponse.json({
            orders,
            total,
            page,
            limit,
            hasMore: skip + orders.length < total,
        });
    } catch (error) {
        console.error("GET /api/all-orders:", error);

        return NextResponse.json(
            { error: "Не удалось загрузить заказы" },
            { status: 500 }
        );
    }
}
