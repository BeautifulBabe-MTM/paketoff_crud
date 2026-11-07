"use client";

import { useCallback, useEffect, useState } from "react";

interface Employee {
  _id: string;
  name: string;
  login: string;
  role: "admin" | "manager";
  isActive: boolean;
  createdAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    login: "",
    password: "",
    role: "manager" as "admin" | "manager",
  });

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin-users", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не удалось загрузить сотрудников");
      }

      setEmployees(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка загрузки сотрудников"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const response = await fetch("/api/admin-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не удалось создать сотрудника");
      }

      setMessage("Сотрудник успешно создан");

      setForm({
        name: "",
        login: "",
        password: "",
        role: "manager",
      });

      setShowForm(false);

      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка создания сотрудника"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEmployee = async (employee: Employee) => {
    const action = employee.isActive ? "заблокировать" : "активировать";

    if (!window.confirm(`Вы действительно хотите ${action} сотрудника ${employee.name}?`)) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(`/api/admin-users/${employee._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !employee.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не удалось изменить статус");
      }

      setMessage(data.message);

      await loadEmployees();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка изменения статуса"
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Сотрудники
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Управление учётными записями Backoffice
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setMessage("");
          }}
          className="rounded-lg bg-yellow-400 px-5 py-3 font-semibold text-gray-900 transition hover:bg-yellow-500"
        >
          {showForm ? "Закрыть форму" : "+ Добавить сотрудника"}
        </button>
      </div>

      {/* Сообщения */}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Форма создания */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            Новый сотрудник
          </h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Имя сотрудника
                </label>

                <input
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Например, Иван"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Логин
                </label>

                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9._-]+"
                  value={form.login}
                  onChange={(e) =>
                    setForm({ ...form, login: e.target.value })
                  }
                  placeholder="ivan.manager"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />

                <p className="mt-1 text-xs text-gray-400">
                  Латиница, цифры, точка, дефис и подчёркивание
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Пароль
                </label>

                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Минимум 12 символов"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Роль
                </label>

                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as "admin" | "manager",
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                >
                  <option value="manager">Менеджер</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Создание..." : "Создать сотрудника"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Таблица сотрудников */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            Список сотрудников
          </h2>

          <span className="text-sm text-gray-500">
            Всего: {employees.length}
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">
            Загрузка сотрудников...
          </div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Сотрудники пока не найдены
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4">Сотрудник</th>
                  <th className="px-6 py-4">Логин</th>
                  <th className="px-6 py-4">Роль</th>
                  <th className="px-6 py-4">Статус</th>
                  <th className="px-6 py-4">Дата создания</th>
                  <th className="px-6 py-4 text-right">Действие</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {employees.map((employee) => (
                  <tr key={employee._id} className="transition hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {employee.name}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {employee.login}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          employee.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {employee.role === "admin"
                          ? "Администратор"
                          : "Менеджер"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          employee.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {employee.isActive ? "Активен" : "Заблокирован"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {new Date(employee.createdAt).toLocaleDateString("ru-RU")}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleEmployee(employee)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          employee.isActive
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {employee.isActive ? "Заблокировать" : "Активировать"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}