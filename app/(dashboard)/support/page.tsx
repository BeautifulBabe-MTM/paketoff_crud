
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  Merge,
  Inbox,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";

interface Ticket {
  _id: string;
  ticketNumber: number;
  from: string;
  email?: string;
  subject: string;
  status: "awaiting reply" | "answered" | "archived";
  date: string;
  messages?: {
    text: string;
    direction: "in" | "out";
    date: string;
  }[];
}

type TicketTab = "awaiting reply" | "answered";

export default function SupportPage() {
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<TicketTab>("awaiting reply");
  const [search, setSearch] = useState("");
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [mergeTarget, setMergeTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchTickets = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const response = await fetch("/api/support", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Не удалось загрузить обращения");
      }

      const data = await response.json();

      setTickets(Array.isArray(data) ? data : []);
      setSelectedTickets([]);
    } catch (err) {
      console.error("Ошибка загрузки тикетов:", err);
      setError("Не удалось загрузить обращения. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const awaitingCount = tickets.filter(
    (ticket) => ticket.status === "awaiting reply"
  ).length;

  const answeredCount = tickets.filter(
    (ticket) => ticket.status === "answered"
  ).length;

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (ticket.status !== activeTab) return false;

      if (!query) return true;

      return (
        String(ticket.ticketNumber).includes(query) ||
        ticket.subject?.toLowerCase().includes(query) ||
        ticket.from?.toLowerCase().includes(query) ||
        ticket.email?.toLowerCase().includes(query)
      );
    });
  }, [tickets, activeTab, search]);

  function getUserIdentifier(ticket: Ticket) {
    return (
      ticket.email?.trim().toLowerCase() ||
      ticket.from?.trim().toLowerCase()
    );
  }

  function handleCheckboxChange(ticket: Ticket, checked: boolean) {
    setSelectedTickets((prev) => {
      if (checked) {
        if (
          prev.length > 0 &&
          getUserIdentifier(prev[0]) !== getUserIdentifier(ticket)
        ) {
          setError("Можно выбирать только тикеты одного пользователя.");
          return prev;
        }

        setError("");
        return [...prev, ticket];
      }

      return prev.filter((item) => item._id !== ticket._id);
    });
  }

  async function handleMerge() {
    if (!mergeTarget.trim()) {
      setError("Введите номер целевого тикета.");
      return;
    }

    if (!/^\d+$/.test(mergeTarget.trim())) {
      setError("Номер тикета должен содержать только цифры.");
      return;
    }

    if (selectedTickets.length === 0) {
      setError("Сначала выберите тикеты для объединения.");
      return;
    }

    setMerging(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/support/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetTicketNumber: mergeTarget.trim(),
          ticketsToMerge: selectedTickets.map((ticket) => ticket._id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при объединении тикетов");
      }

      setSelectedTickets([]);
      setMergeTarget("");
      setMessage("Тикеты успешно объединены.");

      await fetchTickets(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось объединить тикеты."
      );
    } finally {
      setMerging(false);
    }
  }

  function formatDate(date: string) {
    if (!date) return "—";

    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      {/* Заголовок */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MessageSquare size={21} />
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              Поддержка
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Управление обращениями и перепиской с клиентами
          </p>
        </div>

        <button
          onClick={() => fetchTickets(false)}
          disabled={refreshing || loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Обновить
        </button>
      </div>

      {/* Счётчики */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={17} className="text-blue-600" />
            Ожидают ответа
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {awaitingCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 size={17} className="text-green-600" />
            Закрытые
          </div>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {answeredCount}
          </p>
        </div>
      </div>

      {/* Основная карточка */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <div className="flex flex-col gap-4">
            {/* Переключение статусов */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setActiveTab("awaiting reply");
                  setSelectedTickets([]);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === "awaiting reply"
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Clock size={16} />
                Ожидают ответа
                <span className="font-semibold">
                  {awaitingCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("answered");
                  setSelectedTickets([]);
                }}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  activeTab === "answered"
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <CheckCircle2 size={16} />
                Закрытые
                <span className="font-semibold">
                  {answeredCount}
                </span>
              </button>
            </div>

            {/* Поиск */}
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по номеру, теме или клиенту..."
                className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Ошибки и сообщения */}
        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mx-5 mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* Список тикетов */}
        <div className="p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 size={28} className="animate-spin" />
              <p className="mt-3 text-sm">Загрузка обращений...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Inbox size={25} />
              </div>

              <p className="mt-4 font-semibold text-gray-800">
                Ничего не найдено
              </p>

              <p className="mt-1 text-sm text-gray-500">
                В этой категории пока нет обращений.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTickets.map((ticket) => {
                const isSelected = selectedTickets.some(
                  (item) => item._id === ticket._id
                );

                return (
                  <div
                    key={ticket._id}
                    className={`flex items-start gap-3 rounded-lg border p-4 transition ${
                      isSelected
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        handleCheckboxChange(ticket, e.target.checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
                    />

                    <button
                      onClick={() =>
                        router.push(`/support/${ticket._id}`)
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          #{ticket.ticketNumber} — {ticket.subject || "Без темы"}
                        </p>

                        <span className="shrink-0 text-xs text-gray-400">
                          {formatDate(ticket.date)}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {ticket.from || "Неизвестный отправитель"}
                      </p>

                      {ticket.email && (
                        <p className="mt-0.5 truncate text-xs text-gray-400">
                          {ticket.email}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {ticket.messages?.length || 0} сообщений
                        </span>

                        <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
                          Открыть
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Объединение тикетов */}
        {selectedTickets.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Выбрано тикетов: {selectedTickets.length}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Все обращения должны принадлежать одному пользователю.
                </p>
              </div>

              <button
                onClick={() => setSelectedTickets([])}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Снять выбор
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Номер целевого тикета
                </label>

                <input
                  type="text"
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  placeholder="Например, 1000"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                onClick={handleMerge}
                disabled={merging}
                className="flex items-center justify-center gap-2 self-end rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {merging ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Merge size={17} />
                )}

                Объединить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
