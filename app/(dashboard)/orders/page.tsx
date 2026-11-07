
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
    Order,
    OrderStatus,
    OrdersResponse,
} from "@/lib/types/order";

const STATUS_OPTIONS: {
    value: OrderStatus | "all";
    label: string;
}[] = [
        { value: "all", label: "Все статусы" },
        { value: "new", label: "Новые" },
        { value: "processing", label: "В обработке" },
        { value: "shipped", label: "Отправленные" },
        { value: "completed", label: "Завершённые" },
        { value: "cancelled", label: "Отменённые" },
    ];

const STATUS_STYLES: Record<OrderStatus, string> = {
    new: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    new: "Новый",
    processing: "В обработке",
    shipped: "Отправлен",
    completed: "Выполнен",
    cancelled: "Отменён",
};

export default function OrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    const loadOrders = useCallback(async (
        requestedPage: number,
        append = false
    ) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            setError("");

            const params = new URLSearchParams({
                page: String(requestedPage),
                limit: "20",
                status: statusFilter,
                search: search.trim(),
            });

            const response = await fetch(`/api/orders?${params}`, {
                cache: "no-store",
            });

            const data: OrdersResponse | { error: string } =
                await response.json();

            if (!response.ok || !("orders" in data)) {
                throw new Error(
                    "error" in data
                        ? data.error
                        : "Не удалось загрузить заказы"
                );
            }

            setOrders((prev) => {
                if (!append) return data.orders;

                const existingIds = new Set(
                    prev.map((order) => order._id)
                );

                const uniqueOrders = data.orders.filter(
                    (order) => !existingIds.has(order._id)
                );

                return [...prev, ...uniqueOrders];
            });

            setPage(data.page);
            setHasMore(data.hasMore);
            setTotal(data.total);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка загрузки заказов"
            );
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [statusFilter, search]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadOrders(1);
        }, search.trim() ? 350 : 0);

        return () => clearTimeout(timeout);
    }, [loadOrders]);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Удалить этот заказ?")) return;

        try {
            const response = await fetch(`/api/orders/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Ошибка удаления заказа");
            }

            setOrders((prev) =>
                prev.filter((order) => order._id !== id)
            );

            setTotal((prev) => Math.max(0, prev - 1));
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Не удалось удалить заказ"
            );
        }
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            loadOrders(page + 1, true);
        }
    };

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(date));
    };

    return (
        <div className="space-y-6">
            {/* Заголовок */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Заказы
                    </h1>
                    <p className="text-sm text-gray-500">
                        Управление заказами клиентов ТОЛЬКО с сайта Кулёк
                    </p>
                </div>

                <div className="text-sm text-gray-500">
                    Всего заказов: <span className="font-semibold text-gray-900">{total}</span>
                </div>
            </div>

            {/* Фильтры */}
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Поиск по ID, имени, email или телефону..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                    {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Ошибка */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Загрузка */}
            {loading ? (
                <div className="py-16 text-center text-gray-500">
                    Загрузка заказов...
                </div>
            ) : orders.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
                    <p className="text-lg font-medium text-gray-700">
                        Заказы не найдены
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                        Попробуй изменить поисковый запрос или фильтр.
                    </p>
                </div>
            ) : (
                <>
                    {/* Список заказов */}
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order._id}
                                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    {/* Информация о клиенте */}
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {order.contact?.name || "Без имени"}
                                            </h3>

                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[order.status] ??
                                                    "bg-gray-100 text-gray-700"
                                                    }`}
                                            >
                                                {STATUS_LABELS[order.status] ??
                                                    order.status}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-500">
                                            {order.contact?.email || "Email не указан"}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            {order.contact?.phone || "Телефон не указан"}
                                        </p>

                                        <p className="mt-2 text-xs text-gray-400">
                                            ID: {order._id}
                                        </p>
                                    </div>

                                    {/* Доставка */}
                                    <div className="min-w-0 flex-1 text-sm">
                                        <p className="font-medium text-gray-700">
                                            {order.delivery?.method || "Доставка не указана"}
                                        </p>

                                        <p className="max-w-xs truncate text-gray-500">
                                            {order.delivery?.address || "Адрес не указан"}
                                        </p>

                                        <p className="mt-2 text-xs text-gray-400">
                                            {order.createdAt
                                                ? formatDate(order.createdAt)
                                                : "Дата не указана"}
                                        </p>
                                    </div>

                                    {/* Сумма */}
                                    <div className="text-left lg:min-w-28 lg:text-center">
                                        <p className="text-xs text-gray-400">
                                            Сумма заказа
                                        </p>

                                        <p className="text-lg font-bold text-gray-900">
                                            {(order.total ?? 0).toFixed(2)} ₴
                                        </p>
                                    </div>

                                    {/* Действия */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {order.layout?.path && (
                                            <a
                                                href={order.layout.path}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                            >
                                                Макет
                                            </a>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.push(`/orders/${order._id}`)
                                            }
                                            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                                        >
                                            Просмотр
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.push(`/orders/${order._id}/edit`)
                                            }
                                            className="rounded-lg border border-yellow-200 px-3 py-2 text-sm font-medium text-yellow-700 transition hover:bg-yellow-50"
                                        >
                                            Изменить
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(order._id)}
                                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>

                                {/* Состав заказа */}
                                {order.cart?.length > 0 && (
                                    <div className="mt-4 border-t border-gray-100 pt-3">
                                        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
                                            Состав заказа
                                        </p>

                                        <div className="flex flex-wrap gap-2">
                                            {order.cart.map((item, index) => (
                                                <span
                                                    key={`${order._id}-${index}`}
                                                    className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600"
                                                >
                                                    {item.name} × {item.quantity}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Пагинация */}
                    {hasMore && (
                        <div className="flex justify-center py-4">
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {loadingMore ? "Загрузка..." : "Показать ещё"}
                            </button>
                        </div>
                    )}

                    <p className="text-center text-xs text-gray-400">
                        Показано {orders.length} из {total} заказов
                    </p>
                </>
            )}
        </div>
    );
}
