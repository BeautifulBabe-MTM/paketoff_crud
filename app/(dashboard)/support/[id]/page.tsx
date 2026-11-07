
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  UserRound,
  Mail,
  Pencil,
  Save,
  X,
  Clock,
  CheckCircle2,
  Archive,
  Send,
  Loader2,
  RefreshCw,
  Inbox,
} from "lucide-react";

interface TicketMessage {
  text: string;
  direction: "in" | "out";
  date: string;
}

interface Ticket {
  _id: string;
  ticketNumber: number;
  from: string;
  email?: string;
  subject: string;
  body?: string;
  status: "awaiting reply" | "answered" | "archived";
  date: string;
  messages: TicketMessage[];
}

type EditableField = "subject" | "from" | "email";

export default function SupportTicketPage() {
  const params = useParams();
  const router = useRouter();

  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingField, setSavingField] = useState(false);

  const [changingStatus, setChangingStatus] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchTicket = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const response = await fetch(`/api/support/${ticketId}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось загрузить тикет");
      }

      setTicket(data);
    } catch (err) {
      console.error("Ошибка загрузки тикета:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить тикет"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  function startEditing(field: EditableField) {
    if (!ticket) return;

    setEditingField(field);
    setEditValue(ticket[field] || "");
    setError("");
    setMessage("");
  }

  function cancelEditing() {
    setEditingField(null);
    setEditValue("");
  }

  async function saveField() {
    if (!ticket || !editingField) return;

    const value = editValue.trim();

    if (!value) {
      setError("Поле не может быть пустым.");
      return;
    }

    if (value === (ticket[editingField] || "")) {
      cancelEditing();
      return;
    }

    if (
      editingField === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      setError("Введите корректный email.");
      return;
    }

    setSavingField(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/support/${ticket._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [editingField]: value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при сохранении");
      }

      setTicket(data);
      setEditingField(null);
      setEditValue("");
      setMessage("Изменения сохранены.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сохранить изменения"
      );
    } finally {
      setSavingField(false);
    }
  }

  async function handleStatusChange(
    newStatus: Ticket["status"]
  ) {
    if (!ticket || ticket.status === newStatus) return;

    setChangingStatus(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/support/${ticket._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось изменить статус");
      }

      setTicket(data);
      setMessage("Статус тикета обновлён.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ошибка при изменении статуса"
      );
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleReply() {
    if (!ticket) return;

    const text = replyText.trim();

    if (!text) {
      setError("Введите текст ответа.");
      return;
    }

    if (!ticket.email) {
      setError(
        "У тикета не указан email клиента. Добавьте его перед отправкой."
      );
      return;
    }

    setSending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/support/${ticket._id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не удалось отправить ответ");
      }

      if (data.ticket) {
        setTicket(data.ticket);
      } else {
        await fetchTicket(false);
      }

      setReplyText("");
      setMessage("Ответ успешно отправлен клиенту.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ошибка при отправке ответа"
      );
    } finally {
      setSending(false);
    }
  }

  function formatDate(date: string) {
    if (!date) return "—";

    return new Date(date).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusInfo(status: Ticket["status"]) {
    switch (status) {
      case "awaiting reply":
        return {
          label: "Ожидает ответа",
          icon: Clock,
          className: "bg-amber-50 text-amber-700 border-amber-200",
        };

      case "answered":
        return {
          label: "Закрыт",
          icon: CheckCircle2,
          className: "bg-green-50 text-green-700 border-green-200",
        };

      case "archived":
        return {
          label: "Архив",
          icon: Archive,
          className: "bg-gray-100 text-gray-600 border-gray-200",
        };
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 size={30} className="animate-spin" />
        <p className="mt-3 text-sm">Загрузка тикета...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={() => router.push("/support")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Назад к обращениям
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || "Тикет не найден."}
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(ticket.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      {/* Заголовок */}
      <div>
        <button
          onClick={() => router.push("/support")}
          className="mb-4 flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Назад к обращениям
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MessageSquare size={21} />
              </div>

              <h1 className="text-2xl font-bold text-gray-900">
                Тикет #{ticket.ticketNumber}
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Обращение от {formatDate(ticket.date)}
            </p>
          </div>

          <button
            onClick={() => fetchTicket(false)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Обновить
          </button>
        </div>
      </div>

      {/* Сообщения об ошибках */}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            onClick={() => setError("")}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {message && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <span>{message}</span>

          <button
            onClick={() => setMessage("")}
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Информация о тикете */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <h2 className="font-semibold text-gray-900">
            Информация об обращении
          </h2>

          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${statusInfo.className}`}
          >
            <StatusIcon size={14} />
            {statusInfo.label}
          </span>
        </div>

        {/* Тема */}
        <div className="border-b border-gray-100 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MessageSquare size={16} />
            Тема обращения
          </div>

          {editingField === "subject" ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveField();
                  if (e.key === "Escape") cancelEditing();
                }}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={saveField}
                  disabled={savingField}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={15} />
                  Сохранить
                </button>

                <button
                  onClick={cancelEditing}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="break-words text-sm font-medium text-gray-900">
                {ticket.subject || "Без темы"}
              </p>

              <button
                onClick={() => startEditing("subject")}
                className="shrink-0 text-gray-400 transition hover:text-blue-600"
                title="Редактировать тему"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Отправитель */}
        <div className="border-b border-gray-100 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <UserRound size={16} />
            Отправитель
          </div>

          {editingField === "from" ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveField();
                  if (e.key === "Escape") cancelEditing();
                }}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={saveField}
                  disabled={savingField}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={15} />
                  Сохранить
                </button>

                <button
                  onClick={cancelEditing}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="break-words text-sm font-medium text-gray-900">
                {ticket.from || "Не указан"}
              </p>

              <button
                onClick={() => startEditing("from")}
                className="shrink-0 text-gray-400 transition hover:text-blue-600"
                title="Редактировать отправителя"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="border-b border-gray-100 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Mail size={16} />
            Email клиента
          </div>

          {editingField === "email" ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                type="email"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveField();
                  if (e.key === "Escape") cancelEditing();
                }}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <div className="flex gap-2">
                <button
                  onClick={saveField}
                  disabled={savingField}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={15} />
                  Сохранить
                </button>

                <button
                  onClick={cancelEditing}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="break-all text-sm font-medium text-gray-900">
                {ticket.email || "Email не указан"}
              </p>

              <button
                onClick={() => startEditing("email")}
                className="shrink-0 text-gray-400 transition hover:text-blue-600"
                title="Редактировать email"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Статус */}
        <div className="pt-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Изменить статус
          </label>

          <select
            value={ticket.status}
            onChange={(e) =>
              handleStatusChange(e.target.value as Ticket["status"])
            }
            disabled={changingStatus}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          >
            <option value="awaiting reply">Ожидает ответа</option>
            <option value="answered">Закрыт</option>
            <option value="archived">Архив</option>
          </select>
        </div>
      </div>

      {/* Переписка */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="font-semibold text-gray-900">
              История переписки
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Сообщений: {ticket.messages?.length || 0}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              Клиент
            </span>

            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Вы
            </span>
          </div>
        </div>

        <div className="max-h-[600px] space-y-4 overflow-y-auto bg-gray-50/50 p-5">
          {!ticket.messages || ticket.messages.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400">
              <Inbox size={30} />
              <p className="mt-3 text-sm">
                История переписки пуста
              </p>
            </div>
          ) : (
            ticket.messages.map((msg, index) => {
              const isOutgoing = msg.direction === "out";

              return (
                <div
                  key={`${msg.date}-${index}`}
                  className={`flex ${
                    isOutgoing ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl border p-4 shadow-sm sm:max-w-[80%] ${
                      isOutgoing
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span
                        className={`text-xs font-semibold ${
                          isOutgoing
                            ? "text-blue-700"
                            : "text-gray-700"
                        }`}
                      >
                        {isOutgoing ? "Вы" : "Клиент"}
                      </span>

                      <span className="text-xs text-gray-400">
                        {formatDate(msg.date)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ответ */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900">
            Ответ клиенту
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Ответ будет отправлен на email:{" "}
            <span className="font-medium text-gray-700">
              {ticket.email || "Не указан"}
            </span>
          </p>
        </div>

        {!ticket.email && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Перед отправкой ответа необходимо указать email клиента в информации об обращении.
          </div>
        )}

        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Напишите ответ клиенту..."
          rows={5}
          disabled={sending}
          className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
        />

        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-400">
            Ответ будет сохранён в истории переписки.
          </p>

          <button
            onClick={handleReply}
            disabled={sending || !replyText.trim() || !ticket.email}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}

            {sending ? "Отправка..." : "Отправить ответ"}
          </button>
        </div>
      </div>
    </div>
  );
}
