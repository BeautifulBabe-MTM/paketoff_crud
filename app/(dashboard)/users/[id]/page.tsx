
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    UserRound,
    AtSign,
    Mail,
    Percent,
    Pencil,
    Trash2,
    Save,
    X,
    LoaderCircle,
    ShieldCheck,
    CalendarDays,
} from "lucide-react";

interface User {
    _id: string;
    name: string;
    login: string;
    email: string;
    discount: number;
    createdAt?: string;
}

export default function UserDetailsPage() {
    const params = useParams();
    const router = useRouter();

    const id = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // Загрузка пользователя
    const loadUser = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(`/api/users/${id}`, {
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Пользователь не найден");
            }

            setUser(data);
            setIsEditing(false);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Ошибка загрузки пользователя"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, [id]);

    // Изменение полей
    const updateField = (
        field: keyof User,
        value: string | number
    ) => {
        setUser((prev) =>
            prev ? { ...prev, [field]: value } : prev
        );
    };

    // Сохранение
    const saveUser = async () => {
        if (!user) return;

        if (
            !user.name.trim() ||
            !user.login.trim() ||
            !user.email.trim()
        ) {
            alert("Заполни все обязательные поля");
            return;
        }

        if (
            !Number.isFinite(user.discount) ||
            user.discount < 0 ||
            user.discount > 100
        ) {
            alert("Скидка должна быть от 0 до 100%");
            return;
        }

        try {
            setSaving(true);

            const response = await fetch(`/api/users/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: user.name,
                    login: user.login,
                    email: user.email,
                    discount: user.discount,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Ошибка сохранения");
            }

            setUser(data);
            setIsEditing(false);

            router.push("/users");
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Не удалось сохранить пользователя"
            );
        } finally {
            setSaving(false);
        }
    };

    // Удаление
    const deleteUser = async () => {
        if (
            !window.confirm(
                "Вы действительно хотите удалить пользователя?"
            )
        ) {
            return;
        }

        try {
            setDeleting(true);

            const response = await fetch(`/api/users/${id}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Ошибка удаления пользователя"
                );
            }

            router.push("/users");
        } catch (err) {
            alert(
                err instanceof Error
                    ? err.message
                    : "Не удалось удалить пользователя"
            );
        } finally {
            setDeleting(false);
        }
    };

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
                        Загружаем данные пользователя…
                    </span>
                </div>
            </div>
        );
    }

    // Ошибка
    if (error || !user) {
        return (
            <div className="mx-auto max-w-7xl px-6 py-10">
                <div className="rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                        <UserRound
                            size={25}
                            className="text-red-500"
                        />
                    </div>

                    <p className="font-semibold text-red-600">
                        {error || "Пользователь не найден"}
                    </p>

                    <Link
                        href="/users"
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-yellow-500"
                    >
                        <ArrowLeft size={16} />
                        К списку пользователей
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:py-10">

            {/* Навигация */}
            <div className="mb-7">
                <Link
                    href="/users"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-yellow-700"
                >
                    <ArrowLeft size={17} />
                    Все пользователи
                </Link>
            </div>

            {/* Заголовок */}
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-yellow-600">
                        <UserRound size={17} />
                        Управление клиентами
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Карточка пользователя
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Информация об аккаунте и персональных условиях
                    </p>
                </div>

                {isEditing ? (
                    <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2.5">
                        <Pencil
                            size={16}
                            className="text-yellow-700"
                        />
                        <span className="text-sm font-semibold text-yellow-800">
                            Режим редактирования
                        </span>
                    </div>
                ) : (
                    <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-2.5">
                        <ShieldCheck
                            size={16}
                            className="text-green-600"
                        />
                        <span className="text-sm font-semibold text-green-700">
                            Просмотр данных
                        </span>
                    </div>
                )}
            </div>

            {/* Карточка профиля */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

                <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">

                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-2xl font-bold uppercase text-yellow-800">
                            {user.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                            <h2 className="truncate text-xl font-bold text-gray-900">
                                {user.name}
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                @{user.login}
                            </p>

                            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-600">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                Клиент Paketoff
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-3 sm:min-w-[170px]">
                        <p className="text-xs font-medium text-gray-500">
                            Персональная скидка
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-2xl font-bold text-gray-900">
                                {user.discount ?? 0}
                            </span>

                            <Percent
                                size={19}
                                className="text-yellow-600"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Основная информация */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

                {/* Заголовок секции */}
                <div className="flex flex-col gap-2 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">
                            Информация об аккаунте
                        </h2>

                        <p className="mt-0.5 text-sm text-gray-500">
                            Основные данные пользователя
                        </p>
                    </div>

                    {!isEditing && (
                        <span className="text-xs font-medium text-gray-400">
                            Только для просмотра
                        </span>
                    )}
                </div>

                {/* Поля */}
                <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">

                    <Input
                        label="Имя пользователя"
                        value={user.name}
                        onChange={(value) =>
                            updateField("name", value)
                        }
                        readOnly={!isEditing}
                        icon={<UserRound size={17} />}
                    />

                    <Input
                        label="Логин"
                        value={user.login}
                        onChange={(value) =>
                            updateField("login", value)
                        }
                        readOnly={!isEditing}
                        icon={<AtSign size={17} />}
                    />

                    <Input
                        label="Электронная почта"
                        value={user.email}
                        onChange={(value) =>
                            updateField("email", value)
                        }
                        readOnly={!isEditing}
                        icon={<Mail size={17} />}
                    />

                    <Input
                        label="Персональная скидка"
                        type="number"
                        value={String(user.discount ?? 0)}
                        onChange={(value) =>
                            updateField(
                                "discount",
                                value === "" ? 0 : Number(value)
                            )
                        }
                        readOnly={!isEditing}
                        icon={<Percent size={17} />}
                    />

                </div>

                {/* Подсказка */}
                {isEditing && (
                    <div className="mx-6 mb-6 flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                        <Percent
                            size={18}
                            className="mt-0.5 shrink-0 text-yellow-700"
                        />

                        <div>
                            <p className="text-sm font-semibold text-yellow-900">
                                Настройка скидки
                            </p>

                            <p className="mt-0.5 text-xs leading-relaxed text-yellow-800">
                                Укажи значение от 0 до 100. Изменения
                                вступят в силу после сохранения.
                            </p>
                        </div>
                    </div>
                )}

                {/* Нижняя панель */}
                <div className="flex flex-col-reverse justify-between gap-4 border-t border-gray-100 bg-gray-50/50 px-6 py-5 sm:flex-row sm:items-center">

                    {/* Удаление */}
                    <button
                        onClick={deleteUser}
                        disabled={deleting || saving}
                        className="inline-flex w-fit items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {deleting ? (
                            <LoaderCircle
                                size={17}
                                className="animate-spin"
                            />
                        ) : (
                            <Trash2 size={17} />
                        )}

                        {deleting ? "Удаление…" : "Удалить пользователя"}
                    </button>

                    {/* Управление редактированием */}
                    {isEditing ? (
                        <div className="flex flex-col-reverse gap-3 sm:flex-row">

                            <button
                                onClick={loadUser}
                                disabled={saving || deleting}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <X size={17} />
                                Отмена
                            </button>

                            <button
                                onClick={saveUser}
                                disabled={saving || deleting}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {saving ? (
                                    <LoaderCircle
                                        size={17}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Save size={17} />
                                )}

                                {saving ? "Сохраняем…" : "Сохранить изменения"}
                            </button>

                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-yellow-500"
                        >
                            <Pencil size={17} />
                            Редактировать
                        </button>
                    )}

                </div>
            </div>

            {/* Дополнительная информация */}
            {user.createdAt && (
                <div className="mt-5 flex items-center gap-2 px-1 text-xs text-gray-400">
                    <CalendarDays size={14} />

                    Дата регистрации:{" "}
                    {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                    })}
                </div>
            )}

        </div>
    );
}

// Компонент поля
interface InputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    readOnly?: boolean;
    icon?: React.ReactNode;
}

function Input({
    label,
    value,
    onChange,
    type = "text",
    readOnly = false,
    icon,
}: InputProps) {
    return (
        <div className="min-w-0 space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
                {label}
            </label>

            <div className="relative">
                {icon && (
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}

                <input
                    type={type}
                    value={value}
                    min={type === "number" ? 0 : undefined}
                    max={type === "number" ? 100 : undefined}
                    step={type === "number" ? "0.1" : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    readOnly={readOnly}
                    className={`h-12 w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none transition ${
                        readOnly
                            ? "cursor-default border-gray-100 bg-gray-50 text-gray-600"
                            : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                    }`}
                />
            </div>
        </div>
    );
}
