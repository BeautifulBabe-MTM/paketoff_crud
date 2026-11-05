
"use client";

import { useEffect, useState } from "react";
import type {
  Product,
  ProductFormData,
  PriceTier,
  PrintOption,
} from "@/lib/types/product";

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

const emptyForm: ProductFormData = {
  name: "",
  category: "",
  subcategory: null,
  currency: "грн",
  price: [{ minQty: 1, price: 0 }],
  description: "",
  tags: [],
  type: "",
  weight: "",
  color: "",
  appMethod: "",
  material: "",
  bottom: false,
  handle: false,
  handleColor: "",
  density: "",
  size: "",
  docsPocket: false,
  stickyAss: false,
  window: false,
  zipLock: false,
  images: [],
  printOptions: [],
};

export default function ProductForm({
  initialData,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(emptyForm);

  const [tagsInput, setTagsInput] = useState("");
  const [imagesInput, setImagesInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Заполняем форму при редактировании
  useEffect(() => {
    if (initialData) {
      setForm({
        ...emptyForm,
        ...initialData,
        subcategory: initialData.subcategory ?? null,
        price: initialData.price ?? [],
        tags: initialData.tags ?? [],
        images: initialData.images ?? [],
        printOptions: initialData.printOptions ?? [],
      });

      setTagsInput((initialData.tags ?? []).join(", "));
      setImagesInput((initialData.images ?? []).join(", "));
    } else {
      setForm(emptyForm);
      setTagsInput("");
      setImagesInput("");
    }

    setError("");
  }, [initialData]);

  // Изменение обычных полей
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Изменение характеристик Boolean
  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Изменение цены
  const handlePriceChange = (
    index: number,
    field: keyof PriceTier,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      price: prev.price.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value === "" ? 0 : Number(value),
            }
          : item
      ),
    }));
  };

  const addPrice = () => {
    setForm((prev) => ({
      ...prev,
      price: [...prev.price, { minQty: 1, price: 0 }],
    }));
  };

  const removePrice = (index: number) => {
    setForm((prev) => ({
      ...prev,
      price: prev.price.filter((_, i) => i !== index),
    }));
  };

  // Изменение вариантов печати
  const handlePrintOptionChange = (
    index: number,
    field: keyof PrintOption,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      printOptions: prev.printOptions.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "code" ? value : Number(value),
            }
          : item
      ),
    }));
  };

  const addPrintOption = () => {
    setForm((prev) => ({
      ...prev,
      printOptions: [
        ...prev.printOptions,
        { code: "", quantity: 0, price: 0 },
      ],
    }));
  };

  const removePrintOption = (index: number) => {
    setForm((prev) => ({
      ...prev,
      printOptions: prev.printOptions.filter((_, i) => i !== index),
    }));
  };

  const handleTagsChange = (value: string) => {
    setTagsInput(value);

    setForm((prev) => ({
      ...prev,
      tags: value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    }));
  };

  const handleImagesChange = (value: string) => {
    setImagesInput(value);

    setForm((prev) => ({
      ...prev,
      images: value
        .split(",")
        .map((image) => image.trim())
        .filter(Boolean),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const quantities = form.price.map((item) => item.minQty);
    if (new Set(quantities).size !== quantities.length) {
      setError("Количество в ценовых категориях должно быть уникальным.");
      return;
    }

    const invalidImage = (form.images ?? []).some((url) => {
      try {
        const parsed = new URL(url);
        return (
          !["http:", "https:"].includes(parsed.protocol) ||
          !/\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(parsed.pathname + parsed.search)
        );
      } catch {
        return true;
      }
    });

    if (invalidImage) {
      setError("Проверь URL изображений. Допустимы JPG, JPEG, PNG и WEBP.");
      return;
    }

    try {
      setLoading(true);
      await onSubmit(form);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка сохранения товара"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Основная информация */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Основная информация
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Название *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Категория *</label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Подкатегория</label>
            <input
              name="subcategory"
              value={form.subcategory ?? ""}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  subcategory: e.target.value || null,
                }))
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Валюта *</label>
            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="грн">Гривна (грн)</option>
              <option value="€">Евро (€)</option>
              <option value="$">Доллар ($)</option>
              <option value="CHF">Швейцарский франк (CHF)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Описание *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className={inputClass}
              required
            />
          </div>
        </div>
      </section>

      {/* Характеристики */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Характеристики
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["type", "Тип"],
              ["weight", "Вес"],
              ["color", "Цвет"],
              ["appMethod", "Способ нанесения"],
              ["material", "Материал"],
              ["density", "Плотность"],
              ["size", "Размер"],
              ["handleColor", "Цвет ручки"],
            ] as const
          ).map(([name, label]) => (
            <div key={name}>
              <label className={labelClass}>{label}</label>
              <input
                name={name}
                value={form[name] ?? ""}
                onChange={handleChange}
                className={inputClass}
                required={name === "color" || name === "size"}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["bottom", "Дно"],
              ["handle", "Ручка"],
              ["docsPocket", "Карман для документов"],
              ["stickyAss", "Липкий клапан"],
              ["window", "Окно"],
              ["zipLock", "Zip-lock"],
            ] as const
          ).map(([name, label]) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                name={name}
                checked={Boolean(form[name])}
                onChange={handleCheckbox}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* Цены */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Цены
          </h2>

          <button
            type="button"
            onClick={addPrice}
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            + Добавить цену
          </button>
        </div>

        {form.price.map((item, index) => (
          <div
            key={index}
            className="mb-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label className={labelClass}>Количество от</label>
              <input
                type="number"
                min="1"
                value={item.minQty}
                onChange={(e) =>
                  handlePriceChange(index, "minQty", e.target.value)
                }
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Цена</label>
              <input
                type="number"
                min="0"
                step="any"
                value={item.price}
                onChange={(e) =>
                  handlePriceChange(index, "price", e.target.value)
                }
                className={inputClass}
                required
              />
            </div>

            <button
              type="button"
              onClick={() => removePrice(index)}
              className="col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100 sm:col-span-1"
            >
              Удалить
            </button>
          </div>
        ))}

        {form.price.length === 0 && (
          <p className="text-sm text-gray-500">
            Ценовые категории не добавлены.
          </p>
        )}
      </section>

      {/* Варианты печати */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Варианты печати
          </h2>

          <button
            type="button"
            onClick={addPrintOption}
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            + Добавить вариант
          </button>
        </div>

        {form.printOptions.map((item, index) => (
          <div
            key={index}
            className="mb-4 grid gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-3"
          >
            <div>
              <label className={labelClass}>Код (например, 2x1)</label>
              <input
                value={item.code}
                onChange={(e) =>
                  handlePrintOptionChange(index, "code", e.target.value)
                }
                className={inputClass}
                pattern="\d+x\d+"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Количество</label>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) =>
                  handlePrintOptionChange(index, "quantity", e.target.value)
                }
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Цена</label>
              <input
                type="number"
                min="0"
                step="any"
                value={item.price}
                onChange={(e) =>
                  handlePrintOptionChange(index, "price", e.target.value)
                }
                className={inputClass}
                required
              />
            </div>

            <button
              type="button"
              onClick={() => removePrintOption(index)}
              className="text-left text-sm text-red-600 hover:underline sm:col-span-3"
            >
              Удалить вариант
            </button>
          </div>
        ))}

        {form.printOptions.length === 0 && (
          <p className="text-sm text-gray-500">
            Варианты печати не добавлены.
          </p>
        )}
      </section>

      {/* Теги и изображения */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Теги и изображения
        </h2>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              Теги (через запятую)
            </label>
            <input
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="пакет, бумажный, брендированный"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              URL изображений (через запятую)
            </label>
            <textarea
              value={imagesInput}
              onChange={(e) => handleImagesChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
              rows={3}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500">
              Поддерживаются JPG, JPEG, PNG и WEBP.
            </p>
          </div>
        </div>
      </section>

      {/* Ошибка */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Кнопки */}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Отмена
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Сохранение..."
            : initialData
              ? "Сохранить изменения"
              : "Создать товар"}
        </button>
      </div>
    </form>
  );
}
