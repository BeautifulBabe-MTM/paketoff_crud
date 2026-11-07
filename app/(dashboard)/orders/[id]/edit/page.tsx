
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Loader2,
    User,
    Truck,
    Package,
    CreditCard,
    Upload,
    FileText,
    ExternalLink,
    MessageSquare,
    X,
} from "lucide-react";

import type {
    Order,
    OrderCartItem,
} from "@/lib/types/order";

// Статусы заказа
type OrderStatus =
    | "new"
    | "processing"
    | "shipped"
    | "completed"
    | "cancelled";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const STATUS_LABELS: Record<OrderStatus, string> = {
    new: "Новый",
    processing: "В обработке",
    shipped: "Отправлен",
    completed: "Выполнен",
    cancelled: "Отменён",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
    new: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

const INPUT_CLASS =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100";

const LABEL_CLASS =
    "mb-1.5 block text-sm font-medium text-gray-600";

const CARD_CLASS =
    "rounded-xl border border-gray-200 bg-white p-5";

const SECTION_TITLE_CLASS =
    "flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-semibold text-gray-900";

const statuses: { value: OrderStatus; label: string }[] = [
    { value: "new", label: "Новый" },
    { value: "processing", label: "В обработке" },
    { value: "shipped", label: "Отправлен" },
    { value: "completed", label: "Выполнен" },
    { value: "cancelled", label: "Отменён" },
];

export default function EditOrderPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingLayout, setUploadingLayout] = useState(false);
    const [deletingLayout, setDeletingLayout] = useState(false);

    // Загрузка заказа
    useEffect(() => {
        async function loadOrder() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `/api/orders/${params.id}`,
                    { cache: "no-store" }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Не удалось загрузить заказ"
                    );
                }

                setOrder(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Ошибка загрузки заказа"
                );
            } finally {
                setLoading(false);
            }
        }

        if (params.id) {
            loadOrder();
        }
    }, [params.id]);

    // Обновление полей заказа
    function updateOrder<K extends keyof Order>(
        field: K,
        value: Order[K]
    ) {
        setOrder((current) =>
            current
                ? { ...current, [field]: value }
                : current
        );
    }

    // Обновление товара в корзине
    function updateCartItem(
        index: number,
        field: keyof OrderCartItem,
        value: string | number
    ) {
        if (!order) return;

        const updatedCart = [...(order.cart ?? [])];

        updatedCart[index] = {
            ...updatedCart[index],
            [field]: value,
        };

        setOrder({
            ...order,
            cart: updatedCart,
        });
    }

    // Добавление товара
    function addCartItem() {
        if (!order) return;

        setOrder({
            ...order,
            cart: [
                ...(order.cart ?? []),
                {
                    name: "",
                    quantity: 1,
                    price: 0,
                },
            ],
        });
    }

    // Удаление товара
    function removeCartItem(index: number) {
        if (!order) return;

        setOrder({
            ...order,
            cart: order.cart.filter((_, i) => i !== index),
        });
    }

    // Подсчёт общей суммы
    const total =
        order?.cart?.reduce(
            (sum, item) =>
                sum +
                Number(item.quantity || 0) *
                Number(item.price || 0),
            0
        ) ?? 0;

    // Сохранение заказа
    async function saveOrder() {
        if (!order || saving) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/orders/${params.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        contact: order.contact,
                        delivery: order.delivery,
                        cart: order.cart,
                        paymentMethod: order.paymentMethod,
                        status: order.status,
                        comment: order.comment,
                        language: order.language,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Не удалось сохранить заказ"
                );
            }

            setOrder(data);
            setSuccess("Изменения успешно сохранены");

            router.push(`/orders/${params.id}`);
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка сохранения заказа"
            );
        } finally {
            setSaving(false);
        }
    }

    // Загрузка макета в Cloudflare R2
    async function uploadLayout() {
        if (!selectedFile || uploadingLayout || deletingLayout) {
            return;
        }

        if (selectedFile.size <= 0 || selectedFile.size > MAX_FILE_SIZE) {
            setError("Размер файла должен быть от 1 байта до 100 МБ");
            return;
        }

        setUploadingLayout(true);
        setError("");
        setSuccess("");

        try {
            const contentType =
                selectedFile.type || "application/octet-stream";

            // ЭТАП 1. Получаем временную ссылку от Next.js.
            const urlResponse = await fetch(
                `/api/orders/${params.id}/layout/upload-url`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        filename: selectedFile.name,
                        contentType,
                        size: selectedFile.size,
                    }),
                }
            );

            const urlData = await urlResponse.json();

            if (!urlResponse.ok) {
                throw new Error(
                    urlData.error ||
                    "Не удалось подготовить загрузку"
                );
            }

            if (!urlData.uploadUrl || !urlData.storageKey) {
                throw new Error(
                    "Сервер не вернул ссылку для загрузки"
                );
            }

            // ЭТАП 2. Загружаем файл непосредственно в Cloudflare R2.
            const uploadResponse = await fetch(
                urlData.uploadUrl,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": contentType,
                    },
                    body: selectedFile,
                }
            );

            if (!uploadResponse.ok) {
                throw new Error(
                    `Cloudflare R2 отклонил загрузку. HTTP ${uploadResponse.status}`
                );
            }

            // ЭТАП 3. Подтверждаем загрузку и сохраняем данные в MongoDB.
            const completeResponse = await fetch(
                `/api/orders/${params.id}/layout/complete`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        storageKey: urlData.storageKey,
                        filename: selectedFile.name,
                        originalName: selectedFile.name,
                        contentType,
                        size: selectedFile.size,
                    }),
                }
            );

            const completeData = await completeResponse.json();

            if (!completeResponse.ok) {
                throw new Error(
                    completeData.error ||
                    "Не удалось сохранить информацию о макете"
                );
            }

            // Обновляем заказ на странице.
            setOrder((current) =>
                current
                    ? {
                        ...current,
                        layout: completeData.layout,
                    }
                    : current
            );

            setSelectedFile(null);

            // Сбрасываем input выбора файла.
            const fileInput = document.getElementById(
                "order-layout-input"
            ) as HTMLInputElement | null;

            if (fileInput) {
                fileInput.value = "";
            }

            setSuccess(
                "Макет успешно загружен в Cloudflare R2"
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка загрузки макета"
            );
        } finally {
            setUploadingLayout(false);
        }
    }

    // Удаление макета
    async function deleteLayout() {
        if (deletingLayout || uploadingLayout || !order?.layout) {
            return;
        }

        const confirmed = window.confirm(
            "Удалить прикреплённый макет заказа?"
        );

        if (!confirmed) return;

        setDeletingLayout(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/orders/${params.id}/layout`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Не удалось удалить макет"
                );
            }

            setOrder((current) =>
                current
                    ? {
                        ...current,
                        layout: undefined,
                    }
                    : current
            );

            setSelectedFile(null);

            const fileInput = document.getElementById(
                "order-layout-input"
            ) as HTMLInputElement | null;

            if (fileInput) {
                fileInput.value = "";
            }

            setSuccess("Макет удалён");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка удаления макета"
            );
        } finally {
            setDeletingLayout(false);
        }
    }

    // Форматирование размера файла
    function formatFileSize(bytes: number) {
        if (bytes < 1024) {
            return `${bytes} Б`;
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} КБ`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
    }

    // Загрузка
    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                Загрузка заказа...
            </div>
        );
    }

    // Заказ не найден
    if (!order) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => router.push("/orders")}
                    className="flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
                >
                    <ArrowLeft size={16} />
                    Назад к заказам
                </button>

                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    {error || "Заказ не найден"}
                </div>
            </div>
        );
    }

    const status = order.status as OrderStatus;

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-10">

            {/* Header */}
            <div>
                <button
                    onClick={() => router.push(`/orders/${order._id}`)}
                    className="mb-5 flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
                >
                    <ArrowLeft size={17} />
                    Назад к заказу
                </button>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Редактирование заказа #{order._id.slice(-8)}
                        </h1>

                        <div className="mt-2 flex items-center gap-3">
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status] ??
                                    "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                {STATUS_LABELS[status] ?? status}
                            </span>

                            <span className="text-sm text-gray-400">
                                Изменение информации о заказе
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                router.push(`/orders/${order._id}`)
                            }
                            disabled={saving}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            <X size={16} />
                            Отмена
                        </button>

                        <button
                            onClick={saveOrder}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}

                            {saving
                                ? "Сохранение..."
                                : "Сохранить"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}

                    <button
                        onClick={() => setError("")}
                        className="text-red-500 hover:text-red-700"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    {success}
                </div>
            )}

            {/* Contact */}
            <section className={CARD_CLASS}>
                <div className={`mb-5 ${SECTION_TITLE_CLASS}`}>
                    <User size={18} className="text-gray-400" />
                    Контактная информация
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className={LABEL_CLASS}>
                            Имя / Компания
                        </label>

                        <input
                            className={INPUT_CLASS}
                            value={order.contact?.name ?? ""}
                            onChange={(e) =>
                                updateOrder("contact", {
                                    ...order.contact,
                                    name: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Телефон
                        </label>

                        <input
                            className={INPUT_CLASS}
                            value={order.contact?.phone ?? ""}
                            onChange={(e) =>
                                updateOrder("contact", {
                                    ...order.contact,
                                    phone: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>
                            Email
                        </label>

                        <input
                            type="email"
                            className={INPUT_CLASS}
                            value={order.contact?.email ?? ""}
                            onChange={(e) =>
                                updateOrder("contact", {
                                    ...order.contact,
                                    email: e.target.value,
                                })
                            }
                        />
                    </div>
                </div>
            </section>

            {/* Delivery */}
            <section className={CARD_CLASS}>
                <div className={`mb-5 ${SECTION_TITLE_CLASS}`}>
                    <Truck size={18} className="text-gray-400" />
                    Доставка
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className={LABEL_CLASS}>
                            Способ доставки
                        </label>

                        <input
                            className={INPUT_CLASS}
                            value={order.delivery?.method ?? ""}
                            onChange={(e) =>
                                updateOrder("delivery", {
                                    ...order.delivery,
                                    method: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Адрес доставки
                        </label>

                        <input
                            className={INPUT_CLASS}
                            value={order.delivery?.address ?? ""}
                            onChange={(e) =>
                                updateOrder("delivery", {
                                    ...order.delivery,
                                    address: e.target.value,
                                })
                            }
                        />
                    </div>
                </div>
            </section>

            {/* Order layout */}
            <section className={CARD_CLASS}>
                <div className={`mb-5 ${SECTION_TITLE_CLASS}`}>
                    <FileText size={18} className="text-gray-400" />
                    Макет заказа
                </div>

                {order.layout ? (
                    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500">
                                <FileText size={22} />
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900">
                                    {order.layout.originalName ||
                                        order.layout.filename}
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                    {order.layout.size
                                        ? formatFileSize(order.layout.size)
                                        : "Размер неизвестен"}
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                            <a
                                href={`/api/orders/${order._id}/layout`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-100"
                            >
                                <ExternalLink size={15} />
                                Открыть
                            </a>

                            <button
                                type="button"
                                onClick={deleteLayout}
                                disabled={deletingLayout || uploadingLayout}
                                className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                                {deletingLayout ? (
                                    <Loader2
                                        size={15}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Trash2 size={15} />
                                )}

                                Удалить
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="mb-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
                        <FileText
                            size={30}
                            className="mx-auto text-gray-300"
                        />

                        <p className="mt-2 text-sm font-medium text-gray-700">
                            Макет ещё не прикреплён
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                            Выбери файл с компьютера, чтобы прикрепить его к заказу
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <div>
                        <label
                            htmlFor="order-layout-input"
                            className={LABEL_CLASS}
                        >
                            {order.layout
                                ? "Заменить макет"
                                : "Загрузить макет"}
                        </label>

                        <input
                            id="order-layout-input"
                            type="file"
                            disabled={uploadingLayout || deletingLayout}
                            onChange={(e) =>
                                setSelectedFile(
                                    e.target.files?.[0] ?? null
                                )
                            }
                            className="block w-full cursor-pointer rounded-lg border border-gray-200 bg-white text-sm text-gray-600 file:mr-4 file:cursor-pointer file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
                        />
                    </div>

                    {selectedFile && (
                        <div className="flex flex-col gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-800">
                                    {selectedFile.name}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    {formatFileSize(selectedFile.size)}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFile(null);

                                    const input = document.getElementById(
                                        "order-layout-input"
                                    ) as HTMLInputElement | null;

                                    if (input) input.value = "";
                                }}
                                className="flex items-center gap-1 self-start text-xs text-gray-500 hover:text-red-600 sm:self-center"
                            >
                                <X size={14} />
                                Отменить выбор
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={uploadLayout}
                        disabled={
                            !selectedFile ||
                            uploadingLayout ||
                            deletingLayout
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        {uploadingLayout ? (
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                        ) : (
                            <Upload size={17} />
                        )}

                        {uploadingLayout
                            ? "Загрузка..."
                            : order.layout
                                ? "Загрузить новый макет"
                                : "Загрузить макет"}
                    </button>

                    <p className="text-xs text-gray-400">
                        Максимальный размер файла — 100 МБ.
                    </p>
                </div>
            </section>

            {/* Cart */}
            <section className={CARD_CLASS}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Package
                            size={18}
                            className="text-gray-400"
                        />

                        <h2 className="font-semibold text-gray-900">
                            Состав заказа
                        </h2>
                    </div>

                    <button
                        onClick={addCartItem}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                    >
                        <Plus size={16} />
                        Добавить товар
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 text-left text-gray-400">
                                <th className="py-3 pr-3 font-medium">
                                    Товар
                                </th>

                                <th className="w-28 px-2 text-center font-medium">
                                    Количество
                                </th>

                                <th className="w-36 px-2 text-right font-medium">
                                    Цена
                                </th>

                                <th className="w-36 px-2 text-right font-medium">
                                    Сумма
                                </th>

                                <th className="w-12"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {(order.cart ?? []).map((item, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-gray-50 last:border-0"
                                >
                                    <td className="py-3 pr-3">
                                        <input
                                            className={INPUT_CLASS}
                                            value={item.name ?? ""}
                                            onChange={(e) =>
                                                updateCartItem(
                                                    index,
                                                    "name",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Название товара"
                                        />
                                    </td>

                                    <td className="px-2 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            className={`${INPUT_CLASS} text-center`}
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateCartItem(
                                                    index,
                                                    "quantity",
                                                    Number(e.target.value)
                                                )
                                            }
                                        />
                                    </td>

                                    <td className="px-2 py-3">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className={`${INPUT_CLASS} text-right`}
                                            value={item.price}
                                            onChange={(e) =>
                                                updateCartItem(
                                                    index,
                                                    "price",
                                                    Number(e.target.value)
                                                )
                                            }
                                        />
                                    </td>

                                    <td className="px-2 py-3 text-right font-medium text-gray-900">
                                        {(
                                            Number(item.quantity || 0) *
                                            Number(item.price || 0)
                                        ).toFixed(2)} ₴
                                    </td>

                                    <td className="py-3 pl-2 text-right">
                                        <button
                                            onClick={() =>
                                                removeCartItem(index)
                                            }
                                            title="Удалить товар"
                                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                                        >
                                            <Trash2 size={17} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {order.cart.length === 0 && (
                    <p className="py-8 text-center text-sm text-gray-400">
                        В заказе пока нет товаров
                    </p>
                )}

                <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
                    <div className="text-right">
                        <p className="text-sm text-gray-400">
                            Итоговая сумма
                        </p>

                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {total.toFixed(2)} ₴
                        </p>
                    </div>
                </div>
            </section>

            {/* Payment and status */}
            <section className={CARD_CLASS}>
                <div className={`mb-5 ${SECTION_TITLE_CLASS}`}>
                    <CreditCard
                        size={18}
                        className="text-gray-400"
                    />

                    Оплата и статус
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className={LABEL_CLASS}>
                            Способ оплаты
                        </label>

                        <input
                            className={INPUT_CLASS}
                            value={order.paymentMethod ?? ""}
                            onChange={(e) =>
                                updateOrder(
                                    "paymentMethod",
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Статус заказа
                        </label>

                        <select
                            className={INPUT_CLASS}
                            value={order.status}
                            onChange={(e) =>
                                updateOrder(
                                    "status",
                                    e.target.value as OrderStatus
                                )
                            }
                        >
                            {statuses.map((item) => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </option>
                            ))}
                        </select>

                        <div className="mt-2">
                            <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status] ??
                                    "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                {STATUS_LABELS[status] ?? status}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Язык заказа
                        </label>

                        <select
                            className={INPUT_CLASS}
                            value={order.language ?? "uk"}
                            onChange={(e) =>
                                updateOrder(
                                    "language",
                                    e.target.value
                                )
                            }
                        >
                            <option value="uk">Украинский</option>
                            <option value="ru">Русский</option>
                            <option value="en">Английский</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Comment */}
            <section className={CARD_CLASS}>
                <div className={`mb-4 ${SECTION_TITLE_CLASS}`}>
                    <MessageSquare
                        size={18}
                        className="text-gray-400"
                    />

                    Комментарий
                </div>

                <textarea
                    rows={5}
                    className={`${INPUT_CLASS} resize-y`}
                    value={order.comment ?? ""}
                    onChange={(e) =>
                        updateOrder("comment", e.target.value)
                    }
                    placeholder="Комментарий к заказу..."
                />
            </section>

            {/* Footer */}
            <div className="flex flex-col-reverse justify-between gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center">
                <button
                    onClick={() =>
                        router.push(`/orders/${order._id}`)
                    }
                    disabled={saving}
                    className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                    Отменить изменения
                </button>

                <button
                    onClick={saveOrder}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 rounded-lg bg-yellow-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? (
                        <Loader2
                            size={17}
                            className="animate-spin"
                        />
                    ) : (
                        <Save size={17} />
                    )}

                    {saving
                        ? "Сохранение..."
                        : "Сохранить изменения"}
                </button>
            </div>
        </div>
    );
}
