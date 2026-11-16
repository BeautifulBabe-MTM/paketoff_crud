
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Order, OrderStatus } from "@/lib/types/order";
import type { PlOrder } from "@/lib/types/pl-order";

type Source = "all" | "kulek" | "pl";

type CombinedOrder =
    | (Order & { source: "kulek" })
    | (PlOrder & { source: "pl" });

interface CombinedOrdersResponse {
    orders: CombinedOrder[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

const SOURCE_OPTIONS: {
    value: Source;
    label: string;
}[] = [
    { value: "all", label: "Все заказы" },
    { value: "kulek", label: "Кулёк" },
    { value: "pl", label: "PL-заказы" },
];

const COMMON_STATUS_OPTIONS = [
    { value: "all", label: "Все статусы" },
    { value: "new", label: "Новые" },
    { value: "processing", label: "В обработке" },
    { value: "shipped", label: "Отправленные" },
    { value: "completed", label: "Завершённые" },
    { value: "cancelled", label: "Отменённые" },
    { value: "pending", label: "Ожидают оплаты" },
];

const KULEK_STATUS_OPTIONS = [
    { value: "all", label: "Все статусы" },
    { value: "new", label: "Новые" },
    { value: "processing", label: "В обработке" },
    { value: "shipped", label: "Отправленные" },
    { value: "completed", label: "Завершённые" },
    { value: "cancelled", label: "Отменённые" },
];

const PL_STATUS_OPTIONS = [
    { value: "all", label: "Все статусы" },
    { value: "pending", label: "Ожидает оплаты" },
    { value: "new", label: "Новый" },
    { value: "processing", label: "Оплачен / В подготовке" },
    { value: "shipped", label: "Отправлен" },
    { value: "completed", label: "Доставлен" },
    { value: "cancelled", label: "Отменён" },
];

const STATUS_STYLES: Record<string, string> = {
    new: "bg-yellow-100 text-yellow-800",
    NEW: "bg-yellow-100 text-yellow-800",

    processing: "bg-blue-100 text-blue-800",
    PAID: "bg-blue-100 text-blue-800",
    PREPARING: "bg-blue-100 text-blue-800",

    shipped: "bg-purple-100 text-purple-800",
    SHIPPED: "bg-purple-100 text-purple-800",

    completed: "bg-green-100 text-green-800",
    DELIVERED: "bg-green-100 text-green-800",

    cancelled: "bg-red-100 text-red-800",
    CANCELLED: "bg-red-100 text-red-800",

    PENDING: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<string, string> = {
    new: "Новый",
    NEW: "Новый",

    processing: "В обработке",
    PAID: "Оплачен",
    PREPARING: "В подготовке",

    shipped: "Отправлен",
    SHIPPED: "Отправлен",

    completed: "Выполнен",
    DELIVERED: "Доставлен",

    cancelled: "Отменён",
    CANCELLED: "Отменён",

    PENDING: "Ожидает оплаты",
};

function getStatus(order: CombinedOrder) {
    return order.source === "kulek"
        ? order.status
        : order.paymentStatus;
}

function getCustomerName(order: CombinedOrder) {
    return order.source === "kulek"
        ? order.contact?.name || "Без имени"
        : order.client?.name || "Без имени";
}

function getCustomerEmail(order: CombinedOrder) {
    return order.source === "kulek"
        ? order.contact?.email || "Email не указан"
        : order.client?.email || "Email не указан";
}

function getCustomerPhone(order: CombinedOrder) {
    return order.source === "kulek"
        ? order.contact?.phone || "Телефон не указан"
        : order.client?.phone || "Телефон не указан";
}

function getDeliveryInfo(order: CombinedOrder) {
    if (order.source === "kulek") {
        return {
            title: order.delivery?.method || "Доставка не указана",
            address: order.delivery?.address || "Адрес не указан",
        };
    }

    return {
        title: [
            order.shipping?.country,
            order.shipping?.city,
        ]
            .filter(Boolean)
            .join(", ") || "Доставка не указана",

        address: [
            order.shipping?.address,
            order.shipping?.zip,
        ]
            .filter(Boolean)
            .join(", ") || "Адрес не указан",
    };
}

function getOrderTotal(order: CombinedOrder) {
    return order.source === "kulek"
        ? order.total ?? 0
        : order.totalSum ?? 0;
}

function getOrderCurrency(order: CombinedOrder) {
    return order.source === "kulek"
        ? "UAH"
        : order.currency || "UAH";
}

function getOrderItems(order: CombinedOrder) {
    return order.source === "kulek"
        ? order.cart || []
        : order.items || [];
}

function getLayoutUrl(order: CombinedOrder) {
    return order.source === "kulek"
        ? `/api/orders/${order._id}/layout`
        : `/api/pl-orders/${order._id}/layout`;
}

export default function OrdersPage() {
    const router = useRouter();

    const [orders, setOrders] = useState<CombinedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    const [source, setSource] = useState<Source>("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    const statusOptions =
        source === "kulek"
            ? KULEK_STATUS_OPTIONS
            : source === "pl"
                ? PL_STATUS_OPTIONS
                : COMMON_STATUS_OPTIONS;

    const loadOrders = useCallback(
        async (requestedPage: number, append = false) => {
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
                    source,
                    status: statusFilter,
                    search: search.trim(),
                });

                const response = await fetch(
                    `/api/all-orders?${params}`,
                    { cache: "no-store" }
                );

                const data: CombinedOrdersResponse | { error: string } =
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
                        prev.map(
                            (order) => `${order.source}-${order._id}`
                        )
                    );

                    const uniqueOrders = data.orders.filter(
                        (order) =>
                            !existingIds.has(
                                `${order.source}-${order._id}`
                            )
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
        },
        [source, statusFilter, search]
    );

    useEffect(() => {
        const timeout = setTimeout(
            () => loadOrders(1),
            search.trim() ? 350 : 0
        );

        return () => clearTimeout(timeout);
    }, [loadOrders]);

    const handleSourceChange = (value: Source) => {
        setSource(value);
        setStatusFilter("all");
    };

    const handleDelete = async (order: CombinedOrder) => {
        if (!window.confirm("Удалить этот заказ?")) return;

        try {
            const endpoint =
                order.source === "kulek"
                    ? `/api/orders/${order._id}`
                    : `/api/pl-orders/${order._id}`;

            const response = await fetch(endpoint, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Ошибка удаления заказа"
                );
            }

            setOrders((prev) =>
                prev.filter(
                    (item) =>
                        !(
                            item._id === order._id &&
                            item.source === order.source
                        )
                )
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

    const formatPrice = (order: CombinedOrder) => {
        const amount = getOrderTotal(order);
        const currency = getOrderCurrency(order);

        return `${amount.toLocaleString("uk-UA", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} ${currency}`;
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
                        Управление заказами с сайтов Кулёк и PL
                    </p>
                </div>

                <div className="text-sm text-gray-500">
                    Всего заказов:{" "}
                    <span className="font-semibold text-gray-900">
                        {total}
                    </span>
                </div>
            </div>

            {/* Источники заказов */}
            <div className="flex flex-wrap gap-2">
                {SOURCE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSourceChange(option.value)}
                        className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                            source === option.value
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Фильтры */}
            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Поиск по ID, имени, email, телефону, адресу или товару..."
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
                    {statusOptions.map((option) => (
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
                        {orders.map((order) => {
                            const status = getStatus(order);
                            const delivery = getDeliveryInfo(order);
                            const items = getOrderItems(order);

                            return (
                                <div
                                    key={`${order.source}-${order._id}`}
                                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        {/* Клиент */}
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-gray-900">
                                                    {getCustomerName(order)}
                                                </h3>

                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                        STATUS_STYLES[status] ??
                                                        "bg-gray-100 text-gray-700"
                                                    }`}
                                                >
                                                    {STATUS_LABELS[status] ??
                                                        status}
                                                </span>

                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                        order.source === "pl"
                                                            ? "bg-indigo-100 text-indigo-700"
                                                            : "bg-gray-100 text-gray-700"
                                                    }`}
                                                >
                                                    {order.source === "pl"
                                                        ? "PL"
                                                        : "Кулёк"}
                                                </span>
                                            </div>

                                            <p className="text-sm text-gray-500">
                                                {getCustomerEmail(order)}
                                            </p>

                                            <p className="text-sm text-gray-500">
                                                {getCustomerPhone(order)}
                                            </p>

                                            <p className="mt-2 text-xs text-gray-400">
                                                ID: {order._id}
                                            </p>
                                        </div>

                                        {/* Доставка */}
                                        <div className="min-w-0 flex-1 text-sm">
                                            <p className="font-medium text-gray-700">
                                                {delivery.title}
                                            </p>

                                            <p className="max-w-xs truncate text-gray-500">
                                                {delivery.address}
                                            </p>

                                            <p className="mt-2 text-xs text-gray-400">
                                                {order.createdAt
                                                    ? formatDate(order.createdAt)
                                                    : "Дата не указана"}
                                            </p>
                                        </div>

                                        {/* Сумма */}
                                        <div className="text-left lg:min-w-32 lg:text-center">
                                            <p className="text-xs text-gray-400">
                                                Сумма заказа
                                            </p>

                                            <p className="text-lg font-bold text-gray-900">
                                                {formatPrice(order)}
                                            </p>
                                        </div>

                                        {/* Действия */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {order.layout && (
                                                <a
                                                    href={getLayoutUrl(order)}
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
                                                    router.push(
                                                        order.source === "pl"
                                                            ? `/pl-orders/${order._id}`
                                                            : `/orders/${order._id}`
                                                    )
                                                }
                                                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
                                            >
                                                Просмотр
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.push(
                                                        order.source === "pl"
                                                            ? `/pl-orders/${order._id}/edit`
                                                            : `/orders/${order._id}/edit`
                                                    )
                                                }
                                                className="rounded-lg border border-yellow-200 px-3 py-2 text-sm font-medium text-yellow-700 transition hover:bg-yellow-50"
                                            >
                                                Изменить
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleDelete(order)}
                                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    </div>

                                    {/* Состав заказа */}
                                    {items.length > 0 && (
                                        <div className="mt-4 border-t border-gray-100 pt-3">
                                            <p className="mb-2 text-xs font-semibold uppercase text-gray-400">
                                                Состав заказа
                                            </p>

                                            <div className="flex flex-wrap gap-2">
                                                {items.map((item, index) => (
                                                    <span
                                                        key={`${order.source}-${order._id}-${index}`}
                                                        className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600"
                                                    >
                                                        {item.name} × {item.quantity}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
                                {loadingMore
                                    ? "Загрузка..."
                                    : "Показать ещё"}
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
