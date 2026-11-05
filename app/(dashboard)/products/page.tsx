
"use client";

import { useEffect, useMemo, useState } from "react";

import ProductCard from "@/components/products/ProductCard";
import ProductForm from "@/components/products/ProductForm";

import type { Product, ProductFormData } from "@/lib/types/product";

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Все");

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true);
                setError("");

                const params = new URLSearchParams({
                    page: "1",
                    limit: "20",
                });

                if (selectedCategory !== "Все") {
                    params.set("category", selectedCategory);
                }

                const response = await fetch(
                    `/api/products?${params.toString()}`,
                    { cache: "no-store" }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Не удалось загрузить товары"
                    );
                }

                setProducts(data.products);
                setPage(1);
                setHasMore(data.hasMore);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Ошибка загрузки товаров"
                );
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, [selectedCategory]);

    const [categories, setCategories] = useState<string[]>([]);
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await fetch("/api/products/categories", {
                    cache: "no-store",
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Не удалось загрузить категории"
                    );
                }

                setCategories(data.categories);
            } catch (err) {
                console.error("Ошибка загрузки категорий:", err);
            }
        };

        loadCategories();
    }, []);

    const filteredProducts = products.filter((product) => {
        const query = searchQuery.toLowerCase().trim();

        return (
            !query ||
            product.name.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query) ||
            product.description?.toLowerCase().includes(query)
        );
    });

    const handleCreate = () => {
        setEditingProduct(null);
        setIsFormOpen(true);
        setError("");
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
        setError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingProduct(null);
    };

    const handleSubmit = async (formData: ProductFormData) => {
        const isEditing = Boolean(editingProduct);

        const url = isEditing
            ? `/api/products/${editingProduct!._id}`
            : "/api/products";

        const method = isEditing ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.error ||
                (isEditing
                    ? "Не удалось обновить товар"
                    : "Не удалось создать товар")
            );
        }

        const savedProduct = data as Product;

        if (isEditing) {
            setProducts((prev) =>
                prev.map((product) =>
                    product._id === savedProduct._id ? savedProduct : product
                )
            );
        } else {
            setProducts((prev) => [savedProduct, ...prev]);
        }

        handleCancel();
    };

    const handleDelete = async (id: string) => {
        try {
            setError("");

            const response = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.error || "Не удалось удалить товар");
            }

            setProducts((prev) =>
                prev.filter((product) => product._id !== id)
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Произошла ошибка при удалении товара"
            );
        }
    };

    const loadMoreProducts = async () => {
        if (loadingMore || !hasMore) return;

        try {
            setLoadingMore(true);
            setError("");

            const nextPage = page + 1;

            const response = await fetch(
                `/api/products?page=${nextPage}&limit=20`,
                {
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Не удалось загрузить товары");
            }

            setProducts((prev) => {
                // Собираем ID уже загруженных товаров
                const existingIds = new Set(
                    prev.map((product) => product._id)
                );

                // Оставляем только новые товары
                const uniqueNewProducts = data.products.filter(
                    (product: Product) => !existingIds.has(product._id)
                );

                return [...prev, ...uniqueNewProducts];
            });

            setPage(nextPage);
            setHasMore(data.hasMore);

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка загрузки товаров"
            );
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Заголовок */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Товары
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Управление ассортиментом продукции
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleCreate}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                    + Добавить товар
                </button>
            </div>

            {/* Форма создания / редактирования */}
            {isFormOpen && (
                <ProductForm
                    initialData={editingProduct}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                />
            )}

            {/* Ошибки страницы */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Поиск и фильтры */}
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Поиск товаров..."
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500"
                >
                    <option value="Все">Все</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>
                            {category}
                        </option>
                    ))}
                </select>
            </div>

            {/* Статистика */}
            <div className="text-sm text-gray-500">
                Найдено товаров:{" "}
                <span className="font-semibold text-gray-900">
                    {filteredProducts.length}
                </span>
            </div>

            {/* Список товаров */}
            {loading ? (
                <div className="py-16 text-center text-gray-500">
                    Загрузка товаров...
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
                    <p className="text-lg font-medium text-gray-700">
                        Товары не найдены
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                        Попробуй изменить поисковый запрос или категорию.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {filteredProducts.map((product) => (
                        <ProductCard
                            key={product._id}
                            product={product}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {hasMore && selectedCategory === "Все" && !searchQuery.trim() && (
                <div className="flex justify-center py-6">
                    <button
                        type="button"
                        onClick={loadMoreProducts}
                        disabled={loadingMore}
                        className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                    >
                        {loadingMore ? "Загрузка..." : "Загрузить ещё"}
                    </button>
                </div>
            )}
        </div>
    );
}
