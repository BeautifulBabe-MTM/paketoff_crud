
"use client";

import { useEffect, useRef, useState } from "react";
import {
    Trash2,
    Upload,
    Download,
    FileSpreadsheet,
    RefreshCw,
} from "lucide-react";

interface ApiResponse {
    error?: string;
    message?: string;
    files?: string[];
    file?: string;
}

export default function PatternManagerPage() {
    const [patterns, setPatterns] = useState<string[]>([]);

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Получение списка шаблонов
    const fetchPatterns = async () => {
        try {
            setError("");

            const response = await fetch("/api/patterns", {
                cache: "no-store",
            });

            const result: ApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Не удалось загрузить шаблоны"
                );
            }

            if (!Array.isArray(result.files)) {
                throw new Error("Сервер вернул некорректный список файлов");
            }

            setPatterns(result.files);
        } catch (err) {
            console.error("Ошибка загрузки шаблонов:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка при загрузке шаблонов"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatterns();
    }, []);

    // Открытие выбора файла
    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    // Загрузка Excel-файла
    const handleFileUpload = async (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = e.target.files?.[0];

        if (!file) return;

        setError("");
        setMessage("");

        const extension = file.name.split(".").pop()?.toLowerCase();

        if (!extension || !["xlsx", "xls"].includes(extension)) {
            setError("Разрешены только файлы Excel (.xlsx и .xls).");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            setError("Размер файла не должен превышать 20 МБ.");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);

        try {
            const response = await fetch("/api/patterns/upload", {
                method: "POST",
                body: formData,
            });

            const result: ApiResponse = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Не удалось загрузить файл"
                );
            }

            setMessage(
                result.message || `Файл "${file.name}" успешно загружен.`
            );

            await fetchPatterns();
        } catch (err) {
            console.error("Ошибка загрузки файла:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка при загрузке файла"
            );
        } finally {
            setUploading(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };


    const handleDelete = async (filename: string) => {
        const confirmed = window.confirm(
            `Вы действительно хотите удалить шаблон "${filename}"?\n\nЭто действие нельзя отменить.`
        );

        if (!confirmed) return;

        setError("");
        setMessage("");
        setDeleting(filename);

        try {
            const response = await fetch(
                `/api/patterns/${encodeURIComponent(filename)}`,
                {
                    method: "DELETE",
                }
            );

            // Читаем ответ как текст, чтобы не упасть на пустом теле
            const responseText = await response.text();

            let result: ApiResponse = {};

            if (responseText.trim()) {
                try {
                    result = JSON.parse(responseText) as ApiResponse;
                } catch {
                    throw new Error("Сервер вернул некорректный ответ.");
                }
            }

            if (!response.ok) {
                throw new Error(
                    result.error || "Не удалось удалить шаблон"
                );
            }

            setMessage(
                result.message || `Шаблон "${filename}" успешно удалён.`
            );

            await fetchPatterns();
        } catch (err) {
            console.error("Ошибка удаления файла:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка при удалении файла"
            );
        } finally {
            setDeleting(null);
        }
    };


    // Скачивание шаблона
    const handleDownload = (filename: string) => {
        const downloadUrl =
            `/api/patterns/download/${encodeURIComponent(filename)}`;

        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">

            {/* Заголовок */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Шаблоны
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Управление Excel-шаблонами цен печати.
                </p>
            </div>

            {/* Основная карточка */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Управление шаблонами цен (patterns)
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        Загружай, скачивай и удаляй Excel-шаблоны,
                        используемые для обновления цен печати.
                    </p>
                </div>

                {/* Загрузка файла */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">

                    <div className="mb-3">
                        <p className="text-sm font-medium text-gray-800">
                            Загрузить новый шаблон
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                            Поддерживаются форматы XLSX и XLS. Максимальный размер — 20 МБ.
                        </p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={openFilePicker}
                        disabled={uploading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
                    >
                        {uploading ? (
                            <>
                                <RefreshCw
                                    size={18}
                                    className="animate-spin"
                                />
                                Загрузка...
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Выбрать Excel-файл
                            </>
                        )}
                    </button>
                </div>

                {/* Ошибка */}
                {error && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Успешное сообщение */}
                {message && (
                    <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        {message}
                    </div>
                )}

                {/* Список шаблонов */}
                <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                Загруженные шаблоны
                            </h3>

                            <p className="mt-1 text-xs text-gray-500">
                                Всего файлов: {patterns.length}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setLoading(true);
                                fetchPatterns();
                            }}
                            disabled={loading}
                            title="Обновить список"
                            className="rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={18}
                                className={loading ? "animate-spin" : ""}
                            />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                            <RefreshCw
                                size={18}
                                className="animate-spin"
                            />
                            Загрузка шаблонов...
                        </div>
                    ) : patterns.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center">
                            <FileSpreadsheet
                                size={36}
                                className="mx-auto text-gray-400"
                            />

                            <p className="mt-3 text-sm font-medium text-gray-700">
                                Шаблонов пока нет
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                                Загрузи первый Excel-файл, чтобы он появился здесь.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {patterns.map((file) => (
                                <li
                                    key={file}
                                    className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
                                            <FileSpreadsheet
                                                size={21}
                                                className="text-green-600"
                                            />
                                        </div>

                                        <span
                                            className="truncate text-sm font-medium text-gray-800"
                                            title={file}
                                        >
                                            {file}
                                        </span>
                                    </div>

                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleDownload(file)}
                                            disabled={deleting === file}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 sm:flex-none"
                                        >
                                            <Download size={16} />
                                            Скачать
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(file)}
                                            disabled={
                                                deleting !== null ||
                                                uploading
                                            }
                                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                                        >
                                            {deleting === file ? (
                                                <RefreshCw
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}

                                            {deleting === file
                                                ? "Удаление..."
                                                : "Удалить"}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Информация */}
            <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">
                    Как работают шаблоны
                </h3>

                <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-gray-600">
                    <li>Загружаешь Excel-файл с ценами печати.</li>
                    <li>Шаблон появляется в списке доступных файлов.</li>
                    <li>Переходишь во вкладку «Цены печатей».</li>
                    <li>Выбираешь категорию и нужный шаблон.</li>
                    <li>Система применяет цены из Excel к товарам.</li>
                </ol>
            </div>
        </div>
    );
}
