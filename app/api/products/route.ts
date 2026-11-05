
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import Product from "@/lib/models/Product";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit")) || 20)
    );

    const category = searchParams.get("category") || "";
    const skip = (page - 1) * limit;

    // Формируем фильтр
    const filter: Record<string, unknown> = {};

    if (category && category !== "Все") {
      if (category.includes(" > ")) {
        // Выбрана подкатегория
        const [mainCategory, subcategory] = category.split(" > ");

        filter.category = mainCategory;
        filter.subcategory = subcategory;
      } else {
        // Выбрана основная категория
        filter.category = category;
      }
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      hasMore: skip + products.length < total,
    });
  } catch (error) {
    console.error("GET /api/products:", error);

    return NextResponse.json(
      { error: "Ошибка получения товаров" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    await connectDB();

    const newProduct = await Product.create(body);

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("POST /api/products:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Некорректный JSON" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ошибка создания товара",
      },
      { status: 400 }
    );
  }
}
