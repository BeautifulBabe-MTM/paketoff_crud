"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Copy,
    Edit,
    Loader2,
    User,
    MapPin,
    Package,
    CreditCard,
    MessageSquare,
    FileText,
    ExternalLink,
} from "lucide-react";

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
    items: {
        productId: string;
        name: string;
        size: string;
        print: string;
        quantity: number;
        total: number;
    }[];
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
        path?: string;
    };
    createdAt: string;
    updatedAt: string;
};

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

const CARD_CLASS =
    "rounded-xl border border-gray-200 bg-white p-5";

const SECTION_TITLE_CLASS =
    "mb-5 flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-semibold text-gray-900";

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

function formatDate(value: string) {
    return new Date(value).toLocaleString("uk-UA", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} КБ`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
}

export default function PlOrderPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [order, setOrder] = useState<PlOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

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
                if (!data.order) {
                    throw new Error("API не вернул данные PL-заказа");
                }
                setOrder(data);
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

    async function copyId() {
        if (!order) return;

        await navigator.clipboard.writeText(order._id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
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

    const status = order.paymentStatus || "PENDING";

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-10">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.push("/orders")}
                    className="mb-5 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
                >
                    <ArrowLeft size={17} />
                    Назад к заказам
                </button>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            PL-заказ #{order._id?.slice(-8) ?? "Загрузка"}
                        </h1>

                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status] ??
                                    "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                {STATUS_LABELS[status] ?? status}
                            </span>

                            <span className="text-sm text-gray-400">
                                {formatDate(order.createdAt)}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={copyId}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                        >
                            <Copy size={16} />
                            {copied ? "Скопировано" : "ID"}
                        </button>

                        <button
                            onClick={() =>
                                router.push(`/pl-orders/${order._id}/edit`)
                            }
                            className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-600"
                        >
                            <Edit size={16} />
                            Редактировать
                        </button>
                    </div>
                </div>
            </div>

            {/* Client */}
            <section className={CARD_CLASS}>
                <div className={SECTION_TITLE_CLASS}>
                    <User size={18} className="text-gray-400" />
                    Контактная информация
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-xs text-gray-400">Имя / Компания</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {order.client?.name || "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400">Телефон</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.client?.phone || "—"}
                        </p>
                    </div>

                    <div className="sm:col-span-2">
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.client?.email || "—"}
                        </p>
                    </div>
                </div>
            </section>

            {/* Shipping */}
            <section className={CARD_CLASS}>
                <div className={SECTION_TITLE_CLASS}>
                    <MapPin size={18} className="text-gray-400" />
                    Адрес доставки
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-xs text-gray-400">Страна</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.shipping?.country || "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400">Город</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.shipping?.city || "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400">Адрес</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.shipping?.address || "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400">Индекс</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.shipping?.zip || "—"}
                        </p>
                    </div>
                </div>
            </section>

            {/* Items */}
            <section className={CARD_CLASS}>
                <div className={SECTION_TITLE_CLASS}>
                    <Package size={18} className="text-gray-400" />
                    Состав заказа
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 text-left text-gray-400">
                                <th className="py-3 pr-3 font-medium">Товар</th>
                                <th className="px-3 py-3 font-medium">Размер</th>
                                <th className="px-3 py-3 font-medium">Печать</th>
                                <th className="px-3 py-3 text-right font-medium">Количество</th>
                                <th className="py-3 pl-3 text-right font-medium">Сумма</th>
                            </tr>
                        </thead>

                        <tbody>
                            {(order.items ?? []).map((item, index) => (
                                <tr
                                    key={`${item.productId}-${index}`}
                                    className="border-b border-gray-50 last:border-0"
                                >
                                    <td className="py-3 pr-3 font-medium text-gray-900">
                                        {item.name || "—"}
                                    </td>
                                    <td className="px-3 py-3 text-gray-600">
                                        {item.size || "—"}
                                    </td>
                                    <td className="px-3 py-3 text-gray-600">
                                        {item.print || "—"}
                                    </td>
                                    <td className="px-3 py-3 text-right text-gray-600">
                                        {item.quantity}
                                    </td>
                                    <td className="py-3 pl-3 text-right font-medium text-gray-900">
                                        {formatMoney(item.total, order.currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {order.items?.length === 0 && (
                    <p className="py-6 text-center text-sm text-gray-400">
                        В заказе пока нет товаров
                    </p>
                )}

                <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Итоговая сумма</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {formatMoney(order.totalSum, order.currency)}
                        </p>
                    </div>
                </div>
            </section>

            {/* Payment */}
            <section className={CARD_CLASS}>
                <div className={SECTION_TITLE_CLASS}>
                    <CreditCard size={18} className="text-gray-400" />
                    Оплата
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <p className="text-xs text-gray-400">Способ оплаты</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.paymentMethod || "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400">Статус оплаты / заказа</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {STATUS_LABELS[status] ?? status}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400">Валюта</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.currency || "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-400">Язык / локаль</p>
                        <p className="mt-1 text-sm text-gray-900">
                            {order.locale || "—"}
                        </p>
                    </div>
                </div>
            </section>

            {/* Comment */}
            <section className={CARD_CLASS}>
                <div className={SECTION_TITLE_CLASS}>
                    <MessageSquare size={18} className="text-gray-400" />
                    Комментарий
                </div>

                <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {order.comment?.trim() || "Комментарий отсутствует"}
                </p>
            </section>

            {/* Layout */}
            <section className={CARD_CLASS}>
                <div className={SECTION_TITLE_CLASS}>
                    <FileText size={18} className="text-gray-400" />
                    Макет заказа
                </div>

                {order.layout ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                                {order.layout.originalName ||
                                    order.layout.filename ||
                                    "Макет"}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                                {order.layout.size
                                    ? formatFileSize(order.layout.size)
                                    : "Размер неизвестен"}
                            </p>
                        </div>

                        <a
                            href={`/api/pl-orders/${order._id}/layout`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                        >
                            <ExternalLink size={15} />
                            Открыть макет
                        </a>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">
                        Макет не прикреплён
                    </p>
                )}
            </section>
        </div>
    );
}