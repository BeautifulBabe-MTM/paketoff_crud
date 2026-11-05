"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/products", icon: "🛒", label: "Товары" },
  { href: "/orders", icon: "📋", label: "Заказы" },
  { href: "/import-products", icon: "⬆️", label: "Загрузить из Excel" },
  { href: "/pricing-price-uploader", icon: "🧮", label: "Цены печатей" },
  { href: "/patterns-manage", icon: "📁", label: "Шаблоны" },
  { href: "/users", icon: "👤", label: "Пользователи" },
  { href: "/support", icon: "📬", label: "Поддержка" },
];

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const linkClass =
    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors duration-200";

  return (
    <div className="min-h-screen bg-gray-50">
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-3 py-6 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Заголовок и кнопка сворачивания */}
        <div className="mb-8 flex items-center justify-between px-2">
          {!collapsed && (
            <h2 className="text-2xl font-extrabold text-yellow-400">
              Backoffice
            </h2>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
            title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          >
            {collapsed ? "➡️" : "⬅️"}
          </button>
        </div>

        {/* Навигация */}
        <nav className="flex flex-1 flex-col gap-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`${linkClass} ${
                  isActive
                    ? "bg-yellow-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="text-lg">{item.icon}</span>

                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Экспорт товаров */}
          {apiUrl ? (
            <a
              href={`${apiUrl}/api/upload/export`}
              target="_blank"
              rel="noopener noreferrer"
              title={collapsed ? "Выгрузить в Excel" : undefined}
              className={`${linkClass} cursor-pointer text-gray-600 hover:bg-gray-100 hover:text-gray-900`}
            >
              <span className="text-lg">⬇️</span>
              {!collapsed && <span>Выгрузить в Excel</span>}
            </a>
          ) : (
            <div
              title={
                collapsed
                  ? "Не настроен адрес API"
                  : "Настроим адрес API позже"
              }
              className={`${linkClass} cursor-not-allowed text-gray-400`}
            >
              <span className="text-lg">⬇️</span>
              {!collapsed && <span>Выгрузить в Excel</span>}
            </div>
          )}
        </nav>

        <div className="border-t border-gray-200 pt-4">
          {!collapsed && (
            <p className="px-3 text-xs text-gray-400">
              Paketoff Admin
            </p>
          )}
        </div>
      </aside>

      {/* Основная область */}
      <main
        className={`min-h-screen p-6 transition-all duration-300 ${
          collapsed ? "ml-20" : "ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}