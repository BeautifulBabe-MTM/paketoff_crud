
"use client";

import { useEffect, useState } from "react";

interface ApiError {
    error?: string;
}

interface CategoryItem {
    category: string;
}

const ALL_CATEGORIES = "Все";

export default function PricingPriceUploaderPage() {
    const [categories, setCategories] = useState<string[]>([]);
    const [files, setFiles] = useState<string[]>([]);

    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedFile, setSelectedFile] = useState("");

    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [updatedCount, setUpdatedCount] = useState<number | null>(null);
    const [optionsCount, setOptionsCount] = useState<number | null>(null);

    const isAllCategories = selectedCategory === ALL_CATEGORIES;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError("");

            try {
                const [categoriesResponse, filesResponse] = await Promise.all([
                    fetch("/api/products/categories"),
                    fetch("/api/patterns"),
                ]);

                if (!categoriesResponse.ok) {
                    throw new Error("Не удалось загрузить категории");
                }

                if (!filesResponse.ok) {
                    throw new Error("Не удалось загрузить Excel-шаблоны");
                }

                const categoriesData = await categoriesResponse.json();
                const filesData = await filesResponse.json();

                let categoriesList: string[] = [];

                if (Array.isArray(categoriesData)) {
                    categoriesList = categoriesData.map(
                        (item: string | CategoryItem) =>
                            typeof item === "string" ? item : item.category
                    );
                } else if (Array.isArray(categoriesData.categories)) {
                    categoriesList = categoriesData.categories.map(
                        (item: string | CategoryItem) =>
                            typeof item === "string" ? item : item.category
                    );
                }

                const uniqueCategories = Array.from(
                    new Set(
                        categoriesList.filter(
                            (category): category is string =>
                                typeof category === "string" &&
                                category.trim().length > 0
                        )
                    )
                ).sort((a, b) => a.localeCompare(b, "ru"));

                setCategories(uniqueCategories);

                setFiles(
                    Array.isArray(filesData.files) ? filesData.files : []
                );
            } catch (err) {
                console.error("Ошибка загрузки данных:", err);

                setError(
                    err instanceof Error
                        ? err.message
                        : "Не удалось загрузить данные"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        setMessage("");
        setError("");
        setUpdatedCount(null);
        setOptionsCount(null);

        if (!selectedCategory || !selectedFile) {
            setError("Выберите категорию и Excel-файл.");
            return;
        }

        const confirmationMessage = isAllCategories
            ? `ВНИМАНИЕ! Вы собираетесь обновить цены печати У ВСЕХ ТОВАРОВ ВО ВСЕХ КАТЕГОРИЯХ!\n\n` +
              `Шаблон: ${selectedFile}\n\n` +
              "Существующие цены печати будут полностью заменены у каждого товара в базе данных.\n\n" +
              "Вы действительно хотите продолжить?"
            : `Вы действительно хотите обновить цены печати для категории "${selectedCategory}"?\n\n` +
              `Шаблон: ${selectedFile}\n\n` +
              "Существующие цены печати у всех товаров этой категории будут полностью заменены.";

        const confirmed = window.confirm(confirmationMessage);

        if (!confirmed) return;

        setUpdating(true);

        try {
            const response = await fetch(
                "/api/products/update-print-prices",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        category: selectedCategory,
                        filename: selectedFile,
                    }),
                }
            );

            const result: ApiError & {
                message?: string;
                updatedCount?: number;
                printOptions?: unknown[];
            } = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Ошибка обновления цен");
            }

            setMessage(result.message || "Цены успешно обновлены.");
            setUpdatedCount(result.updatedCount ?? 0);
            setOptionsCount(result.printOptions?.length ?? 0);
        } catch (err) {
            console.error("Ошибка обновления цен:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Произошла ошибка запроса"
            );
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Цены печатей
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Применение Excel-шаблона с ценами печати к одной или всем категориям товаров.
                </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Обновление цен
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Выберите категорию товаров и Excel-шаблон, из которого будут
                        загружены цены.
                    </p>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                        Загрузка категорий и шаблонов...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="category"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Категория товаров
                            </label>

                            <select
                                id="category"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                disabled={updating}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            >
                                <option value="">Выберите категорию</option>

                                <option value={ALL_CATEGORIES}>
                                    Все категории
                                </option>

                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>

                            {categories.length === 0 && (
                                <p className="mt-2 text-xs text-amber-600">
                                    Категории не найдены. Проверь endpoint /api/products/categories.
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="template"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Excel-шаблон
                            </label>

                            <select
                                id="template"
                                value={selectedFile}
                                onChange={(e) => setSelectedFile(e.target.value)}
                                disabled={updating}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            >
                                <option value="">Выберите Excel-файл</option>

                                {files.map((file) => (
                                    <option key={file} value={file}>
                                        {file}
                                    </option>
                                ))}
                            </select>

                            {files.length === 0 && (
                                <p className="mt-2 text-xs text-amber-600">
                                    Шаблоны не найдены. Сначала загрузите Excel-файл
                                    во вкладке «Шаблоны».
                                </p>
                            )}
                        </div>

                        <div
                            className={`rounded-lg border p-4 ${
                                isAllCategories
                                    ? "border-red-300 bg-red-50"
                                    : "border-amber-200 bg-amber-50"
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-xl">⚠️</span>

                                <div>
                                    <p
                                        className={`text-sm font-semibold ${
                                            isAllCategories
                                                ? "text-red-900"
                                                : "text-amber-900"
                                        }`}
                                    >
                                        {isAllCategories
                                            ? "Массовая замена цен во всех категориях"
                                            : "Внимание: замена существующих цен"}
                                    </p>

                                    <p
                                        className={`mt-1 text-sm ${
                                            isAllCategories
                                                ? "text-red-800"
                                                : "text-amber-800"
                                        }`}
                                    >
                                        {isAllCategories
                                            ? "Выбранный Excel-шаблон полностью заменит цены печати у ВСЕХ товаров во ВСЕХ категориях. Убедитесь, что шаблон подходит для всех товаров."
                                            : "После применения шаблона старые цены печати будут заменены новыми у всех товаров выбранной категории. Остальные характеристики товаров не изменятся."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={
                                updating ||
                                !selectedCategory ||
                                !selectedFile ||
                                categories.length === 0 ||
                                files.length === 0
                            }
                            className={`w-full rounded-lg px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 ${
                                isAllCategories
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-blue-600 hover:bg-blue-700"
                            }`}
                        >
                            {updating
                                ? "Обновление цен..."
                                : isAllCategories
                                    ? "Обновить цены во всех категориях"
                                    : "Обновить цены"}
                        </button>
                    </form>
                )}

                {error && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="text-sm font-semibold text-green-800">
                            {message}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-6 text-sm text-green-700">
                            <span>
                                Обновлено товаров:{" "}
                                <strong>{updatedCount}</strong>
                            </span>

                            <span>
                                Ценовых записей в шаблоне:{" "}
                                <strong>{optionsCount}</strong>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">
                    Как работает обновление
                </h3>

                <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-gray-600">
                    <li>Выбираешь одну категорию или «Все категории».</li>
                    <li>Выбираешь Excel-шаблон с ценами печати.</li>
                    <li>Система считывает коды печати, количества и цены.</li>
                    <li>
                        Новые цены записываются в товары выбранной категории
                        либо во все товары базы данных.
                    </li>
                </ol>
            </div>
        </div>
    );
}
