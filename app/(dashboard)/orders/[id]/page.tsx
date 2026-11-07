
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Package, User, Truck, CreditCard, FileImage, MessageSquare, Globe, Check, } from "lucide-react";

import { Order, OrderStatus } from "@/lib/types/order";

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

export default function OrderViewPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const loadOrder = async () => {
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
        };

        if (params.id) {
            loadOrder();
        }
    }, [params.id]);

    const copyOrderId = async () => {
        if (!order) return;

        try {
            await navigator.clipboard.writeText(order._id);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("Не удалось скопировать ID");
        }
    };

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat("uk-UA", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center text-gray-500">
                Загрузка заказа...
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => router.push("/orders")}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
                >
                    <ArrowLeft size={16} />
                    Назад к заказам
                </button>

                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                    {error || "Заказ не найден"}
                </div>
            </div>
        );
    }

    const status = order.status as OrderStatus;

    return (
        <div className="mx-auto max-w-5xl space-y-6">

            {/* Header */}
            <div>
                <button
                    onClick={() => router.push("/orders")}
                    className="mb-5 flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
                >
                    <ArrowLeft size={17} />
                    Назад к заказам
                </button>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Заказ #{order._id.slice(-8)}
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
                                {order.createdAt ? formatDate(order.createdAt) : "—"}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={copyOrderId}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? "Скопировано" : "Копировать ID"}
                        </button>

                        <button
                            onClick={() =>
                                router.push(`/orders/${order._id}/edit`)
                            }
                            className="rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-yellow-600"
                        >
                            Редактировать
                        </button>
                    </div>
                </div>
            </div>

            {/* Contact and delivery */}
            <div className="grid gap-5 md:grid-cols-2">

                <section className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                        <User size={18} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900">
                            Контактная информация
                        </h2>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div>
                            <p className="text-gray-400">Имя / Компания</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {order.contact?.name || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-400">Email</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {order.contact?.email || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-400">Телефон</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {order.contact?.phone || "—"}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                        <Truck size={18} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900">
                            Доставка
                        </h2>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div>
                            <p className="text-gray-400">Способ доставки</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {order.delivery?.method || "—"}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-400">Адрес</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {order.delivery?.address || "—"}
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Products */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Package size={18} className="text-gray-400" />
                    <h2 className="font-semibold text-gray-900">
                        Состав заказа
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 text-left text-gray-400">
                                <th className="py-3 font-medium">Товар</th>
                                <th className="py-3 text-center font-medium">
                                    Количество
                                </th>
                                <th className="py-3 text-right font-medium">
                                    Цена
                                </th>
                                <th className="py-3 text-right font-medium">
                                    Сумма
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {(order.cart ?? []).map((item, index) => (
                                <tr
                                    key={`${order._id}-${index}`}
                                    className="border-b border-gray-50 last:border-0"
                                >
                                    <td className="py-4 font-medium text-gray-900">
                                        {item.name}
                                    </td>

                                    <td className="py-4 text-center text-gray-600">
                                        {item.quantity}
                                    </td>

                                    <td className="py-4 text-right text-gray-600">
                                        {item.price.toFixed(2)} ₴
                                    </td>

                                    <td className="py-4 text-right font-medium text-gray-900">
                                        {(item.quantity * item.price).toFixed(2)} ₴
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-5 flex justify-end border-t border-gray-100 pt-4">
                    <div className="text-right">
                        <p className="text-sm text-gray-400">
                            Итоговая сумма
                        </p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">
                            {(order.total ?? 0).toFixed(2)} ₴
                        </p>
                    </div>
                </div>
            </section>

            {/* Payment and additional info */}
            <div className="grid gap-5 md:grid-cols-2">

                <section className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                        <CreditCard size={18} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900">
                            Оплата
                        </h2>
                    </div>

                    <p className="text-sm text-gray-400">
                        Способ оплаты
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                        {order.paymentMethod || "—"}
                    </p>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                        <Globe size={18} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900">
                            Дополнительная информация
                        </h2>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="text-gray-400">Язык заказа</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {(order.language || "uk").toUpperCase()}
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-400">Дата создания</p>
                            <p className="mt-1 font-medium text-gray-900">
                                {order.createdAt ? formatDate(order.createdAt) : "—"}
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Comment */}
            {order.comment && (
                <section className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-3 flex items-center gap-2">
                        <MessageSquare size={18} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900">
                            Комментарий
                        </h2>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                        {order.comment}
                    </p>
                </section>
            )}

            {/* Layout */}
            {order.layout?.path && (
                <section className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                        <FileImage size={18} className="text-gray-400" />
                        <h2 className="font-semibold text-gray-900">
                            Макет
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {order.layout.originalName && (
                            <p className="text-sm text-gray-500">
                                Файл: {order.layout.originalName}
                            </p>
                        )}

                        {order.layout.mimeType?.startsWith("image/") ? (
                            <a
                                href={order.layout.path}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <img
                                    src={order.layout.path}
                                    alt="Макет заказа"
                                    className="max-h-[500px] max-w-full rounded-lg border border-gray-200 object-contain"
                                />
                            </a>
                        ) : (
                            <a
                                href={order.layout.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50"
                            >
                                <FileImage size={18} />
                                Открыть файл макета
                            </a>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}