
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Users,
    Search,
    Percent,
    Trash2,
    LoaderCircle,
    Mail,
    UserRound,
    AtSign,
    X,
    ArrowUpRight,
} from "lucide-react";

interface User {
    _id: string;
    name: string;
    login: string;
    email: string;
    discount: number;
    createdAt?: string;
    updatedAt?: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [discountValues, setDiscountValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    // Загрузка пользователей
    const loadUsers = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/users", {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Не удалось загрузить пользователей");
            }

            const data: User[] = await response.json();

            setUsers(data);

            const discounts: Record<string, string> = {};

            data.forEach((user) => {
                discounts[user._id] = String(user.discount ?? 0);
            });

            setDiscountValues(discounts);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка загрузки пользователей"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Изменение скидки
    const updateDiscount = async (id: string) => {
        const user = users.find((item) => item._id === id);

        if (!user) return;

        const discount = Number(discountValues[id]);

        if (
            !Number.isFinite(discount) ||
            discount < 0 ||
            discount > 100
        ) {
            alert("Скидка должна быть от 0 до 100%");

            setDiscountValues((prev) => ({
                ...prev,
                [id]: String(user.discount),
            }));

            return;
        }

        if (discount === user.discount) return;

        try {
            setSavingId(id);

            const response = await fetch(`/api/users/${id}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ discount }),
            });

            const responseText = await response.text();

            let result: any = {};

            try {
                result = responseText
                    ? JSON.parse(responseText)
                    : {};
            } catch {
                throw new Error(
                    `Сервер вернул не JSON. HTTP ${response.status}. ` +
                    `Ответ: ${responseText.slice(0, 200)}`
                );
            }

            if (!response.ok) {
                throw new Error(
                    result.error || `Ошибка сервера: HTTP ${response.status}`
                );
            }

            const updatedUser: User = result;

            setUsers((prev) =>
                prev.map((item) =>
                    item._id === id ? updatedUser : item
                )
            );

            setDiscountValues((prev) => ({
                ...prev,
                [id]: String(updatedUser.discount),
            }));
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Не удалось обновить скидку"
            );

            setDiscountValues((prev) => ({
                ...prev,
                [id]: String(user.discount),
            }));
        } finally {
            setSavingId(null);
        }
    };

    // Удаление пользователя
    const deleteUser = async (id: string) => {
        const confirmed = window.confirm(
            "Вы действительно хотите удалить пользователя?"
        );

        if (!confirmed) return;

        try {
            setDeletingId(id);

            const response = await fetch(`/api/users/${id}`, {
                method: "DELETE",
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Ошибка удаления пользователя"
                );
            }

            setUsers((prev) =>
                prev.filter((user) => user._id !== id)
            );

            setDiscountValues((prev) => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Не удалось удалить пользователя"
            );
        } finally {
            setDeletingId(null);
        }
    };

    // Поиск
    const query = search.trim().toLowerCase();

    const filteredUsers = users.filter((user) => {
        return (
            user.name.toLowerCase().includes(query) ||
            user.login.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        );
    });

    const discountedUsers = users.filter(
        (user) => user.discount > 0
    ).length;

    // Загрузка
    if (loading) {
        return (
            <div className="mx-auto flex min-h-[400px] max-w-7xl items-center justify-center px-6">
                <div className="flex flex-col items-center gap-3">
                    <LoaderCircle
                        size={30}
                        className="animate-spin text-yellow-500"
                    />
                    <span className="text-sm font-medium text-gray-500">
                        Загружаем пользователей…
                    </span>
                </div>
            </div>
        );
    }

    // Ошибка
    if (error) {
        return (
            <div className="mx-auto max-w-7xl px-6 py-10">
                <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
                    <p className="font-semibold text-red-600">
                        {error}
                    </p>

                    <button
                        onClick={loadUsers}
                        className="mt-4 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-yellow-500"
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:py-10">

            {/* Заголовок страницы */}
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-yellow-600">
                        <Users size={17} />
                        Управление клиентами
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Пользователи
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Просмотр клиентских аккаунтов и управление скидками
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2.5">
                    <Users size={17} className="text-yellow-600" />
                    <span className="text-sm font-semibold text-gray-800">
                        {users.length}{" "}
                        {users.length === 1
                            ? "пользователь"
                            : users.length >= 2 && users.length <= 4
                                ? "пользователя"
                                : "пользователей"}
                    </span>
                </div>
            </div>

            {/* Статистика */}
            <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
                        <Users size={23} className="text-yellow-700" />
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            Всего пользователей
                        </p>
                        <p className="mt-0.5 text-2xl font-bold text-gray-900">
                            {users.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                        <Percent size={23} className="text-amber-600" />
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">
                            С персональной скидкой
                        </p>
                        <p className="mt-0.5 text-2xl font-bold text-gray-900">
                            {discountedUsers}
                        </p>
                    </div>
                </div>

            </div>

            {/* Основная карточка */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

                {/* Панель поиска */}
                <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Список пользователей
                        </h2>

                        <p className="mt-0.5 text-sm text-gray-500">
                            Найдено: {filteredUsers.length}
                        </p>
                    </div>

                    <div className="relative w-full sm:max-w-sm">
                        <Search
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            placeholder="Имя, логин или email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-10 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                                aria-label="Очистить поиск"
                            >
                                <X size={17} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Таблица */}
                <div className="overflow-x-auto">
                    <table className="min-w-[850px] w-full text-sm">

                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                <th className="px-6 py-4 text-left">
                                    Пользователь
                                </th>

                                <th className="px-6 py-4 text-left">
                                    Login
                                </th>

                                <th className="px-6 py-4 text-left">
                                    Email
                                </th>

                                <th className="w-48 px-6 py-4 text-left">
                                    Скидка
                                </th>

                                <th className="w-32 px-6 py-4 text-right">
                                    Действия
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">

                            {filteredUsers.map((user) => (
                                <tr
                                    key={user._id}
                                    className="group transition-colors hover:bg-yellow-50/30"
                                >
                                    {/* Имя */}
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/users/${user._id}`}
                                            className="group/name inline-flex items-center gap-3"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-sm font-bold uppercase text-yellow-800 transition group-hover/name:bg-yellow-200">
                                                {user.name.charAt(0)}
                                            </div>

                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-800 transition group-hover/name:text-yellow-700">
                                                    {user.name}
                                                </span>

                                                <span className="mt-0.5 text-xs text-gray-400">
                                                    Клиент Paketoff
                                                </span>
                                            </div>

                                            <ArrowUpRight
                                                size={15}
                                                className="ml-1 text-gray-300 opacity-0 transition group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5 group-hover/name:text-yellow-600 group-hover/name:opacity-100"
                                            />
                                        </Link>
                                    </td>

                                    {/* Логин */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <AtSign
                                                size={15}
                                                className="text-gray-400"
                                            />
                                            {user.login}
                                        </div>
                                    </td>

                                    {/* Email */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Mail
                                                size={15}
                                                className="shrink-0 text-gray-400"
                                            />
                                            {user.email}
                                        </div>
                                    </td>

                                    {/* Скидка */}
                                    <td className="px-6 py-4">
                                        <div className="relative max-w-[130px]">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                value={discountValues[user._id] ?? "0"}
                                                disabled={savingId === user._id}
                                                onChange={(e) =>
                                                    setDiscountValues((prev) => ({
                                                        ...prev,
                                                        [user._id]: e.target.value,
                                                    }))
                                                }
                                                onBlur={() => updateDiscount(user._id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 pr-8 text-sm font-medium text-gray-800 outline-none transition hover:border-gray-300 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100 disabled:cursor-wait disabled:opacity-60"
                                            />

                                            <Percent
                                                size={13}
                                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                            />
                                        </div>

                                        {savingId === user._id && (
                                            <span className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-yellow-700">
                                                <LoaderCircle
                                                    size={12}
                                                    className="animate-spin"
                                                />
                                                Сохранение…
                                            </span>
                                        )}

                                        {savingId !== user._id && user.discount > 0 && (
                                            <span className="mt-1.5 inline-block rounded-md bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-800">
                                                Персональная скидка
                                            </span>
                                        )}
                                    </td>

                                    {/* Действия */}
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => deleteUser(user._id)}
                                            disabled={deletingId === user._id}
                                            title="Удалить пользователя"
                                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            {deletingId === user._id ? (
                                                <LoaderCircle
                                                    size={16}
                                                    className="animate-spin"
                                                />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}

                                            <span>
                                                {deletingId === user._id
                                                    ? "Удаление"
                                                    : "Удалить"}
                                            </span>
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {/* Пустой список */}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-20 text-center"
                                    >
                                        <div className="mx-auto flex max-w-sm flex-col items-center">
                                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                                                {search ? (
                                                    <Search
                                                        size={25}
                                                        className="text-gray-400"
                                                    />
                                                ) : (
                                                    <UserRound
                                                        size={25}
                                                        className="text-gray-400"
                                                    />
                                                )}
                                            </div>

                                            <p className="font-semibold text-gray-700">
                                                {search
                                                    ? "Ничего не найдено"
                                                    : "Пользователей пока нет"}
                                            </p>

                                            <p className="mt-1 text-sm text-gray-400">
                                                {search
                                                    ? "Попробуйте изменить поисковый запрос"
                                                    : "Здесь будут отображаться зарегистрированные клиенты"}
                                            </p>

                                            {search && (
                                                <button
                                                    onClick={() => setSearch("")}
                                                    className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 text-xs font-semibold text-gray-900 transition hover:bg-yellow-500"
                                                >
                                                    Сбросить поиск
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}

                        </tbody>
                    </table>
                </div>

                {/* Нижняя панель */}
                {filteredUsers.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/50 px-5 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Показано {filteredUsers.length} из {users.length} пользователей
                        </span>

                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Данные синхронизированы
                        </span>
                    </div>
                )}

            </div>
        </div>
    );
}
