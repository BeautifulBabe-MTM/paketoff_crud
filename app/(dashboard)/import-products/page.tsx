
"use client";

import { useRef, useState } from "react";

export default function ImportProductsPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<{
        fileName: string;
        added: number;
    } | null>(null);

    const handleFile = (selectedFile?: File) => {
        if (!selectedFile) return;

        setError("");
        setSuccess(null);

        const extension = selectedFile.name.split(".").pop()?.toLowerCase();

        if (!["xlsx", "xls"].includes(extension ?? "")) {
            setError("Выбери файл формата .xlsx или .xls.");
            return;
        }

        if (selectedFile.size > 20 * 1024 * 1024) {
            setError("Размер файла не должен превышать 20 МБ.");
            return;
        }

        setFile(selectedFile);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragActive(false);

        handleFile(event.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file || uploading) return;

        const confirmed = window.confirm(
            "Внимание! Импорт полностью заменит товары тех категорий, которые присутствуют в Excel-файле.\n\nПродолжить?"
        );

        if (!confirmed) return;

        try {
            setUploading(true);
            setError("");
            setSuccess(null);

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Ошибка при импорте файла.");
            }

            setSuccess({
                fileName: data.fileName || file.name,
                added: data.added ?? 0,
            });

            setFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Не удалось загрузить файл."
            );
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            {/* Заголовок */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Загрузить из Excel
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Импорт товаров из Excel-файла в каталог продукции.
                </p>
            </div>

            {/* Информация */}
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex gap-3">
                    <span className="text-xl">⚠️</span>

                    <div>
                        <p className="text-sm font-semibold text-gray-900">
                            Важно перед импортом
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-700">
                            Каждый лист Excel соответствует отдельной категории.
                            При импорте товары существующей категории будут заменены
                            товарами из соответствующего листа. Категории, которых
                            нет в файле, останутся без изменений.
                        </p>
                    </div>
                </div>
            </div>

            {/* Загрузка файла */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-base font-semibold text-gray-900">
                    Выбери Excel-файл
                </h2>

                <div
                    onDragEnter={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                    }}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={(event) => {
                        event.preventDefault();

                        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                            setDragActive(false);
                        }
                    }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                        dragActive
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(event) =>
                            handleFile(event.target.files?.[0])
                        }
                    />

                    <span className="mb-3 text-5xl">
                        {dragActive ? "📥" : "📊"}
                    </span>

                    {dragActive ? (
                        <p className="font-medium text-blue-600">
                            Отпусти файл здесь
                        </p>
                    ) : (
                        <>
                            <p className="font-medium text-gray-800">
                                Перетащи файл сюда или нажми, чтобы выбрать
                            </p>

                            <p className="mt-2 text-sm text-gray-500">
                                Поддерживаются XLSX и XLS, максимум 20 МБ
                            </p>
                        </>
                    )}
                </div>

                {/* Выбранный файл */}
                {file && (
                    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="text-2xl">📄</span>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">
                                    {file.name}
                                </p>

                                <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} МБ
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => {
                                setFile(null);

                                if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                }
                            }}
                            className="text-sm text-red-600 transition hover:text-red-700 disabled:opacity-50"
                        >
                            Удалить
                        </button>
                    </div>
                )}

                {/* Кнопка импорта */}
                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="mt-5 w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                    {uploading ? "Импортируем товары..." : "Загрузить товары"}
                </button>

                {/* Ошибка */}
                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <p className="font-medium">Ошибка импорта</p>
                        <p className="mt-1">{error}</p>
                    </div>
                )}

                {/* Успешный импорт */}
                {success && (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="font-semibold text-green-800">
                            ✓ Импорт успешно завершён
                        </p>

                        <div className="mt-2 space-y-1 text-sm text-green-700">
                            <p>Файл: {success.fileName}</p>
                            <p>Добавлено товаров: {success.added}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Формат Excel */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="text-base font-semibold text-gray-900">
                    Требования к Excel-файлу
                </h2>

                <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
                    <li>• Каждый лист должен называться именем категории товара.</li>
                    <li>• Первая строка должна содержать названия столбцов.</li>
                    <li>• Обязательные поля: Наименование, Валюта, Описание, Цвет, Размер.</li>
                    <li>• Цены указываются в столбцах вида «От 100 шт».</li>
                    <li>• Несколько тегов и изображений разделяются запятыми.</li>
                    <li>• Для булевых характеристик используй «Да» или пустую ячейку.</li>
                </ul>
            </div>
        </div>
    );
}
