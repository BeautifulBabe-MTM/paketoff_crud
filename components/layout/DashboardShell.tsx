
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthUser } from "@/lib/auth";

const navigation = [
  { href: "/orders", icon: "📋", label: "Заказы" },
  { href: "/pricing-price-uploader", icon: "🧮", label: "Цены печатей" },
  { href: "/patterns-manage", icon: "📁", label: "Шаблоны" },
  { href: "/products", icon: "🛒", label: "Товары" },
  { href: "/support", icon: "📬", label: "Поддержка" },
  { href: "/users", icon: "👤", label: "Пользователи" },
  { href: "/import-products", icon: "⬆️", label: "Импорт Excel" },
  { href: "/api/upload/export", icon: "⬇️", label: "Экспорт Excel", external: true },
  { href: "/employees", icon: "👥", label: "Сотрудники" },
];

export default function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AuthUser;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Не удалось завершить сессию");
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Ошибка выхода:", error);
      alert("Не удалось выйти из системы");
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-gray-200/80 bg-white transition-all duration-300 ${collapsed ? "w-[76px]" : "w-[260px]"
          }`}
      >
        {/* LOGO */}
        <div
          className={`flex h-[76px] shrink-0 items-center border-b border-gray-100 ${collapsed ? "justify-center px-2" : "gap-3 px-5"
            }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-xl font-black text-gray-900 shadow-sm">
            P
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold tracking-tight text-gray-900">
                Paketoff
              </h1>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-400">
                ADMIN PANEL
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              title="Свернуть меню"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              «
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Развернуть меню"
            className="mx-auto mt-3 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            »
          </button>
        )}

        {/* NAVIGATION */}
        <div className="flex min-h-0 flex-1 flex-col px-3 pt-6">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
              Управление
            </p>
          )}

          <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pb-3 [scrollbar-color:#d1d5db_transparent] [scrollbar-width:thin]">
            {navigation.map((item) => {
              const isActive =
                !item.external &&
                (pathname === item.href || pathname.startsWith(`${item.href}/`));

              const className = `group relative flex min-h-[44px] shrink-0 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-200 ${collapsed ? "justify-center" : ""
                } ${isActive
                  ? "bg-[#FFF7D6] text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`;

              const content = (
                <>
                  {isActive && (
                    <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-yellow-400" />
                  )}

                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition-colors ${isActive
                      ? "bg-yellow-100"
                      : "bg-transparent group-hover:bg-gray-100"
                      }`}
                  >
                    {item.icon}
                  </span>

                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </>
              );

              return item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={className}
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={className}
                >
                  {content}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* FOOTER */}
        <div className="shrink-0 border-t border-gray-100 p-3">

          {!collapsed && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                👤
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-gray-800">
                  {user.name}
                </p>

                <p className="text-[10px] text-gray-400">
                  {user.role === "admin" ? "Администратор" : "Менеджер"}
                </p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title={collapsed ? "Выйти из системы" : undefined}
            className={`flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-red-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 ${collapsed ? "justify-center" : ""
              }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">
              🚪
            </span>

            {!collapsed && (
              <span>{loggingOut ? "Выходим..." : "Выйти из системы"}</span>
            )}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        className={`min-h-screen min-w-0 overflow-x-hidden p-5 transition-all duration-300 md:p-7 ${collapsed ? "ml-[76px]" : "ml-[260px]"
          }`}
      >
        {children}
      </main>
    </div>
  );
}
