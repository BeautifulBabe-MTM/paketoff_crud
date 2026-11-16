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
    MapPin,
    Package,
    CreditCard,
    Upload,
    FileText,
    ExternalLink,
    MessageSquare,
    X,
} from "lucide-react";

type PlOrderItem = {
    productId: string;
    name: string;
    size: string;
    print: string;
    quantity: number;
    total: number;
};

type PlOrder = {
    _id: string;
    client: {
        name: string;
        phone: string;
        email: string;
    };
    shipping: {
        country: string;
        city: string;
        address: string;
        zip: string;
    };
    items: PlOrderItem[];
    paymentMethod: string;
    paymentStatus: string;
    totalSum: number;
    currency: string;
    locale: string;
    comment?: string;
    layout?: {
        filename?: string;
        originalName?: string;
        mimeType?: string;
        size?: number;
        storageKey?: string;
        storageProvider?: "r2" | "local";
        pathOnDisk?: string;
        path?: string;
    };
    createdAt: string;
    updatedAt: string;
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const STATUS_LABELS: Record<string, string> = {
    PENDING: "Ожидает оплаты",
    NEW: "Новый",
    PAID: "Оплачен",
    PREPARING: "Готовится",
    SHIPPED: "Отправлен",
    DELIVERED: "Доставлен",
    CANCELLED: "Отменён",
};

const STATUS_STYLES: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    NEW: "bg-yellow-100 text-yellow-800",
    PAID: "bg-blue-100 text-blue-800",
    PREPARING: "bg-purple-100 text-purple-800",
    SHIPPED: "bg-indigo-100 text-indigo-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
};

const STATUSES = [
    "PENDING",
    "NEW",
    "PAID",
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
];

const INPUT_CLASS =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100";

const LABEL_CLASS =
    "mb-1.5 block text-sm font-medium text-gray-600";

const CARD_CLASS =
    "rounded-xl border border-gray-200 bg-white p-5";

const SECTION_TITLE_CLASS =
    "flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-semibold text-gray-900";

function formatMoney(value: number, currency: string) {
    try {
        return new Intl.NumberFormat("uk-UA", {
            style: "currency",
            currency: currency || "UAH",
        }).format(value);
    } catch {
        return `${value.toFixed(2)} ${currency}`;
    }
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} Б`;

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} КБ`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

export default function EditPlOrderPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [order, setOrder] = useState<PlOrder | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadingLayout, setUploadingLayout] = useState(false);
    const [deletingLayout, setDeletingLayout] = useState(false);

    // Загрузка PL-заказа
    useEffect(() => {
        async function loadOrder() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `/api/pl-orders/${params.id}`,
                    { cache: "no-store" }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Не удалось загрузить PL-заказ"
                    );
                }

                setOrder({
                    ...data,
                    client: {
                        name: data.client?.name ?? "",
                        phone: data.client?.phone ?? "",
                        email: data.client?.email ?? "",
                    },
                    shipping: {
                        country: data.shipping?.country ?? "",
                        city: data.shipping?.city ?? "",
                        address: data.shipping?.address ?? "",
                        zip: data.shipping?.zip ?? "",
                    },
                    items: data.items ?? [],
                    paymentMethod: data.paymentMethod ?? "",
                    paymentStatus: data.paymentStatus ?? "PENDING",
                    totalSum: Number(data.totalSum ?? 0),
                    currency: data.currency ?? "UAH",
                    locale: data.locale ?? "uk",
                    comment: data.comment ?? "",
                });
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Ошибка загрузки PL-заказа"
                );
            } finally {
                setLoading(false);
            }
        }

        if (params.id) loadOrder();
    }, [params.id]);

    // Обновление верхнеуровневых полей
    function updateOrder<K extends keyof PlOrder>(
        field: K,
        value: PlOrder[K]
    ) {
        setOrder((current) =>
            current ? { ...current, [field]: value } : current
        );
    }

    // Обновление клиента
    function updateClient(
        field: keyof PlOrder["client"],
        value: string
    ) {
        if (!order) return;

        setOrder({
            ...order,
            client: {
                ...order.client,
                [field]: value,
            },
        });
    }

    // Обновление доставки
    function updateShipping(
        field: keyof PlOrder["shipping"],
        value: string
    ) {
        if (!order) return;

        setOrder({
            ...order,
            shipping: {
                ...order.shipping,
                [field]: value,
            },
        });
    }

    // Обновление товара
    function updateItem(
        index: number,
        field: keyof PlOrderItem,
        value: string | number
    ) {
        if (!order) return;

        const items = [...order.items];

        items[index] = {
            ...items[index],
            [field]: value,
        };

        setOrder({
            ...order,
            items,
        });
    }

    // Добавление товара
    function addItem() {
        if (!order) return;

        setOrder({
            ...order,
            items: [
                ...order.items,
                {
                    productId: "",
                    name: "",
                    size: "",
                    print: "",
                    quantity: 1,
                    total: 0,
                },
            ],
        });
    }

    // Удаление товара
    function removeItem(index: number) {
        if (!order) return;

        setOrder({
            ...order,
            items: order.items.filter((_, i) => i !== index),
        });
    }

    // Итоговая сумма рассчитывается из сумм позиций
    const totalSum =
        order?.items.reduce(
            (sum, item) => sum + Number(item.total || 0),
            0
        ) ?? 0;

    // Сохранение PL-заказа
    async function saveOrder() {
        if (!order || saving) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/pl-orders/${params.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        client: order.client,
                        shipping: order.shipping,
                        items: order.items,
                        paymentMethod: order.paymentMethod,
                        paymentStatus: order.paymentStatus,
                        totalSum,
                        currency: order.currency,
                        locale: order.locale,
                        comment: order.comment,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Не удалось сохранить PL-заказ"
                );
            }

            setOrder(data);
            setSuccess("Изменения успешно сохранены");

            router.push(`/pl-orders/${params.id}`);
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка сохранения PL-заказа"
            );
        } finally {
            setSaving(false);
        }
    }

    // Загрузка макета в Cloudflare R2
    async function uploadLayout() {
        if (!order || !selectedFile || uploadingLayout || deletingLayout) {
            return;
        }

        if (
            selectedFile.size <= 0 ||
            selectedFile.size > MAX_FILE_SIZE
        ) {
            setError("Размер файла должен быть от 1 байта до 100 МБ");
            return;
        }

        setUploadingLayout(true);
        setError("");
        setSuccess("");

        try {
            const contentType =
                selectedFile.type || "application/octet-stream";

            // ЭТАП 1. Получаем временную ссылку.
            const urlResponse = await fetch(
                `/api/pl-orders/${params.id}/layout/upload-url`,
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
                    urlData.error || "Не удалось подготовить загрузку"
                );
            }

            if (!urlData.uploadUrl || !urlData.storageKey) {
                throw new Error(
                    "Сервер не вернул ссылку для загрузки"
                );
            }

            // ЭТАП 2. Загружаем файл непосредственно в R2.
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

            // ЭТАП 3. Подтверждаем загрузку.
            const completeResponse = await fetch(
                `/api/pl-orders/${params.id}/layout/complete`,
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

            setOrder((current) =>
                current
                    ? {
                        ...current,
                        layout: completeData.layout,
                    }
                    : current
            );

            setSelectedFile(null);

            const fileInput = document.getElementById(
                "pl-order-layout-input"
            ) as HTMLInputElement | null;

            if (fileInput) fileInput.value = "";

            setSuccess("Макет успешно загружен в Cloudflare R2");
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
        if (
            !order?.layout ||
            deletingLayout ||
            uploadingLayout
        ) {
            return;
        }

        const confirmed = window.confirm(
            "Удалить прикреплённый макет PL-заказа?"
        );

        if (!confirmed) return;

        setDeletingLayout(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch(
                `/api/pl-orders/${params.id}/layout`,
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
                "pl-order-layout-input"
            ) as HTMLInputElement | null;

            if (fileInput) fileInput.value = "";

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

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                Загрузка PL-заказа...
            </div>
        );
    }

    if (!order) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => router.push("/orders")}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
                >
                    <ArrowLeft size={16} />
                    Назад к заказам
                </button>

                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    {error || "PL-заказ не найден"}
                </div>
            </div>
        );
    }

    const status = order.paymentStatus;

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-10">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.push(`/pl-orders/${order._id}`)}
                    className="mb-5 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
                >
                    <ArrowLeft size={17} />
                    Назад к PL-заказу
                </button>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Редактирование PL-заказа #{order._id.slice(-8)}
                        </h1>

                        <div className="mt-2 flex items-center gap-3">
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    STATUS_STYLES[status] ??
                                    "bg-gray-100 text-gray-700"
                                }`}
                            >
                                {STATUS_LABELS[status] ?? status}
                            </span>

                            <span className="text-sm text-gray-400">
                                Изменение информации о PL-заказе
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                router.push(`/pl-orders/${order._id}`)
                            }
                            disabled={saving}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                            <X size={16} />
                            Отмена
                        </button>

                        <button
                            onClick={saveOrder}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}

                            {saving ? "Сохранение..." : "Сохранить"}
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

            {/* Client */}
            <section className={CARD_CLASS}>
                <div className={`mb-5 ${SECTION_TITLE_CLASS}`}>
                    <User size={18} className="text-gray-400" />
                    Контактная информация
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className={LABEL_CLASS}>Имя / Компания</label>
                        <input
                            className={INPUT_CLASS}
                            value={order.client.name}
                            onChange={(e) =>
                                updateClient("name", e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Телефон</label>
                        <input
                            className={INPUT_CLASS}
                            value={order.client.phone}
                            onChange={(e) =>
                                updateClient("phone", e.target.value)
                            }
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className={LABEL_CLASS}>Email</label>
                        <input
                            type="email"
                            className={INPUT_CLASS}
                            value={order.client.email}
                            onChange={(e) =>
                                updateClient("email", e.target.value)
                            }
                        />
                    </div>
                </div>
            </section>

            {/* Shipping */}
            <section className={CARD_CLASS}>
                <div className={`mb-5 ${SECTION_TITLE_CLASS}`}>
                    <MapPin size={18} className="text-gray-400" />
                    Доставка
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className={LABEL_CLASS}>Страна</label>
                        <input
                            className={INPUT_CLASS}
                            value={order.shipping.country}
                            onChange={(e) =>
                                updateShipping("country", e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Город</label>
                        <input
                            className={INPUT_CLASS}
                            value={order.shipping.city}
                            onChange={(e) =>
                                updateShipping("city", e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Адрес</label>
                        <input
                            className={INPUT_CLASS}
                            value={order.shipping.address}
                            onChange={(e) =>
                                updateShipping("address", e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Почтовый индекс</label>
                        <input
                            className={INPUT_CLASS}
                            value={order.shipping.zip}
                            onChange={(e) =>
                                updateShipping("zip", e.target.value)
                            }
                        />
                    </div>
                </div>
            </section>

            {/* Layout */}
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
                                href={`/api/pl-orders/${order._id}/layout`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                            >
                                <ExternalLink size={15} />
                                Открыть
                            </a>

                            <button
                                type="button"
                                onClick={deleteLayout}
                                disabled={deletingLayout || uploadingLayout}
                                className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
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
                            htmlFor="pl-order-layout-input"
                            className={LABEL_CLASS}
                        >
                            {order.layout ? "Заменить макет" : "Загрузить макет"}
                        </label>

                        <input
                            id="pl-order-layout-input"
                            type="file"
                            disabled={uploadingLayout || deletingLayout}
                            onChange={(e) =>
                                setSelectedFile(e.target.files?.[0] ?? null)
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
                                        "pl-order-layout-input"
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
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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

            {/* Items */}
            <section className={CARD_CLASS}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Package size={18} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900">
                            Состав заказа
                        </h2>
                    </div>

                    <button
                        onClick={addItem}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                        <Plus size={16} />
                        Добавить товар
                    </button>
                </div>

                <div className="space-y-4">
                    {order.items.map((item, index) => (
                        <div
                            key={`${item.productId}-${index}`}
                            className="rounded-lg border border-gray-100 p-4"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-700">
                                    Товар #{index + 1}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => removeItem(index)}
                                    title="Удалить товар"
                                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className={LABEL_CLASS}>
                                        Название товара
                                    </label>
                                    <input
                                        className={INPUT_CLASS}
                                        value={item.name}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "name",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Размер
                                    </label>
                                    <input
                                        className={INPUT_CLASS}
                                        value={item.size}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "size",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Печать
                                    </label>
                                    <input
                                        className={INPUT_CLASS}
                                        value={item.print}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "print",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Количество
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        className={INPUT_CLASS}
                                        value={item.quantity}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "quantity",
                                                Number(e.target.value)
                                            )
                                        }
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Сумма за позицию ({order.currency})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className={INPUT_CLASS}
                                        value={item.total}
                                        onChange={(e) =>
                                            updateItem(
                                                index,
                                                "total",
                                                Number(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {order.items.length === 0 && (
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
                            {formatMoney(totalSum, order.currency)}
                        </p>
                    </div>
                </div>
            </section>

            {/* Payment */}
            <section className={CARD_CLASS}>
                <div className={`mb-5 ${SECTION_TITLE_CLASS}`}>
                    <CreditCard size={18} className="text-gray-400" />
                    Оплата и статус
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className={LABEL_CLASS}>
                            Способ оплаты
                        </label>
                        <input
                            className={INPUT_CLASS}
                            value={order.paymentMethod}
                            onChange={(e) =>
                                updateOrder("paymentMethod", e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Статус оплаты / заказа
                        </label>
                        <select
                            className={INPUT_CLASS}
                            value={order.paymentStatus}
                            onChange={(e) =>
                                updateOrder("paymentStatus", e.target.value)
                            }
                        >
                            {!STATUSES.includes(order.paymentStatus) && (
                                <option value={order.paymentStatus}>
                                    {order.paymentStatus}
                                </option>
                            )}

                            {STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {STATUS_LABELS[status]}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Валюта</label>
                        <input
                            className={INPUT_CLASS}
                            value={order.currency}
                            onChange={(e) =>
                                updateOrder("currency", e.target.value.toUpperCase())
                            }
                            placeholder="UAH"
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Язык / локаль</label>
                        <input
                            className={INPUT_CLASS}
                            value={order.locale}
                            onChange={(e) =>
                                updateOrder("locale", e.target.value)
                            }
                            placeholder="uk"
                        />
                    </div>
                </div>
            </section>

            {/* Comment */}
            <section className={CARD_CLASS}>
                <div className={`mb-5 ${SECTION_TITLE_CLASS}`}>
                    <MessageSquare size={18} className="text-gray-400" />
                    Комментарий
                </div>

                <textarea
                    className={`${INPUT_CLASS} min-h-32 resize-y`}
                    value={order.comment ?? ""}
                    onChange={(e) =>
                        updateOrder("comment", e.target.value)
                    }
                    placeholder="Комментарий к заказу..."
                />
            </section>
        </div>
    );
}