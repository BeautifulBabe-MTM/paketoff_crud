import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";

export async function GET() {
    try {
        await connectDB();

        const result = await Product.aggregate([
            {
                $match: {
                    category: {
                        $type: "string",
                        $ne: "",
                    },
                },
            },
            {
                $group: {
                    _id: "$category",
                    subcategories: {
                        $addToSet: "$subcategory",
                    },
                },
            },
            {
                $sort: {
                    _id: 1,
                },
            },
        ]);

        const categories = result.flatMap((item) => {
            const category = item._id;

            const subcategories = item.subcategories
                .filter(
                    (subcategory: string | null) =>
                        typeof subcategory === "string" &&
                        subcategory.trim() !== ""
                )
                .map(
                    (subcategory: string) =>
                        `${category} > ${subcategory}`
                );

            return [category, ...subcategories];
        });

        return NextResponse.json({
            categories: [...new Set(categories)],
        });
    } catch (error) {
        console.error("GET /api/products/categories:", error);

        return NextResponse.json(
            { error: "Ошибка получения категорий" },
            { status: 500 }
        );
    }
}