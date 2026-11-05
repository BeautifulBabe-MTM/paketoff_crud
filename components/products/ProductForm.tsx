
"use client";

import { useEffect, useState } from "react";
import type { Product, ProductFormData } from "@/lib/types/product";

interface ProductFormProps {
  initialData?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

const emptyForm: ProductFormData = {
  name: "",
  category: "",
  subcategory: null,
  currency: "UAH",
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

  // Заполнение формы при редактировании
  useEffect(() => {
    if (initialData) {
      setForm({
        ...emptyForm,
        ...initialData,
        subcategory: initialData.subcategory ?? null,
        tags: initialData.tags ?? [],
        images: initialData.images ?? [],
        price: initialData.price ?? [],
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
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Изменение checkbox
  const handleCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Изменение цен
  const handlePriceChange = (
    index: number,
    field: "minQty" | "price",
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
    field: "code" | "quantity" | "price",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      printOptions: prev.printOptions.map((item, i) =>
        i === index
          ? {
            ...item,
            [field]:
              field === "code"
                ? value
                : value === ""
                  ? 0
                  : Number(value),
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
        { code: "", quantity: 1, price: 0 },
      ],
    }));
  };

  const removePrintOption = (index: number) => {
    setForm((prev) => ({
      ...prev,
      printOptions: prev.printOptions.filter((_, i) => i !== index),
    }));
  };

  // Отправка формы
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.price.length) {
      setError("Добавь хотя бы одну ценовую категорию.");
      return;
    }

    const quantities = form.price.map((item) => item.minQty);

    if (new Set(quantities).size !== quantities.length) {
      setError("Количество каждой ценовой категории должно быть уникальным.");
      return;
    }

    if (form.price.some((item) => item.minQty < 1 || item.price < 0)) {
      setError("Проверь значения ценовых категорий.");
      return;
    }

    if (
      form.images.some(
        (url) => !/^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url.trim())
      )
    ) {
      setError("Некоторые ссылки на изображения имеют неверный формат.");
      return;
    }

    if (
      form.printOptions.some(
        (item) =>
          !/^\d+x\d+$/.test(item.code) ||
          item.quantity < 1 ||
          item.price < 0
      )
    ) {
      setError("Проверь варианты печати: код, количество и цену.");
      return;
    }

    const preparedForm: ProductFormData = {
      ...form,
      tags: tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      images: imagesInput
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean),
    };

    try {
      setLoading(true);
      await onSubmit(preparedForm);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось сохранить товар."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {initialData ? "Редактирование товара" : "Новый товар"}
        </h2>

        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Закрыть
        </button>
      </div>

      {/* Основная информация */}
      <section className="space-y-4">
        <h3 className="border-b pb-2 font-medium text-gray-800">
          Основная информация
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Название" required>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="input"
            />
          </Field>

          <Field label="Категория" required>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="input"
            />
          </Field>

          <Field label="Подкатегория">
            <input
              name="subcategory"
              value={form.subcategory ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  subcategory: event.target.value || null,
                }))
              }
              className="input"
            />
          </Field>

          <Field label="Валюта" required>
            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="input"
            >
              <option value="UAH">UAH (₴)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="CHF">CHF</option>
            </select>
          </Field>
        </div>

        <Field label="Описание">
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="input"
          />
        </Field>
      </section>

      {/* Характеристики */}
      <section className="space-y-4">
        <h3 className="border-b pb-2 font-medium text-gray-800">
          Характеристики
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <Field key={name} label={label} required={name === "color" || name === "size"}>
              <input
                name={name}
                value={form[name] ?? ""}
                onChange={handleChange}
                required={name === "color" || name === "size"}
                className="input"
              />
            </Field>
          ))}
        </div>
      </section>

      {/* Дополнительные опции */}
      <section className="space-y-4">
        <h3 className="border-b pb-2 font-medium text-gray-800">
          Дополнительные опции
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["bottom", "Дно"],
              ["handle", "Ручки"],
              ["docsPocket", "Карман для документов"],
              ["stickyAss", "Клеевой клапан"],
              ["window", "Окно"],
              ["zipLock", "Zip-lock"],
            ] as const
          ).map(([name, label]) => (
            <label
              key={name}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                name={name}
                checked={Boolean(form[name])}
                onChange={handleCheckbox}
                className="h-4 w-4 rounded border-gray-300"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* Цены */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-medium text-gray-800">Цены</h3>

          <button
            type="button"
            onClick={addPrice}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            + Добавить цену
          </button>
        </div>

        {form.price.map((item, index) => (
          <div key={index} className="grid grid-cols-12 items-end gap-3">
            <div className="col-span-5">
              <Field label="От количества">
                <input
                  type="number"
                  min="1"
                  value={item.minQty}
                  onChange={(event) =>
                    handlePriceChange(index, "minQty", event.target.value)
                  }
                  className="input"
                />
              </Field>
            </div>

            <div className="col-span-5">
              <Field label="Цена">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price}
                  onChange={(event) =>
                    handlePriceChange(index, "price", event.target.value)
                  }
                  className="input"
                />
              </Field>
            </div>

            <div className="col-span-2">
              <button
                type="button"
                onClick={() => removePrice(index)}
                className="mb-2 w-full rounded-lg border border-red-200 py-2 text-red-600 hover:bg-red-50"
                title="Удалить цену"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Цены печати */}

      <section className="space-y-4">
        {/* Заголовок секции */}
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-medium text-gray-800">
            Варианты печати
          </h3>

          <button
            type="button"
            onClick={addPrintOption}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            + Добавить вариант
          </button>
        </div>

        {/* Скролл-блок */}
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
          {form.printOptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Варианты печати ещё не добавлены
            </p>
          ) : (
            form.printOptions.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 items-end gap-3 rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="col-span-4">
                  <Field label="Код">
                    <input
                      placeholder="10x15"
                      value={item.code}
                      onChange={(event) =>
                        handlePrintOptionChange(index, "code", event.target.value)
                      }
                      className="input"
                    />
                  </Field>
                </div>

                <div className="col-span-3">
                  <Field label="Количество">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        handlePrintOptionChange(index, "quantity", event.target.value)
                      }
                      className="input"
                    />
                  </Field>
                </div>

                <div className="col-span-3">
                  <Field label="Цена">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(event) =>
                        handlePrintOptionChange(index, "price", event.target.value)
                      }
                      className="input"
                    />
                  </Field>
                </div>

                <div className="col-span-2">
                  <button
                    type="button"
                    onClick={() => removePrintOption(index)}
                    className="mb-2 w-full rounded-lg border border-red-200 py-2 text-red-600 hover:bg-red-50"
                    title="Удалить вариант"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>


      {/* Теги и изображения */}
      <section className="space-y-4">
        <h3 className="border-b pb-2 font-medium text-gray-800">
          Теги и изображения
        </h3>

        <Field label="Теги (через запятую)">
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="пакет, бумага, упаковка"
            className="input"
          />
        </Field>

        <Field label="Ссылки на изображения (через запятую)">
          <textarea
            value={imagesInput}
            onChange={(event) => setImagesInput(event.target.value)}
            rows={3}
            placeholder="https://example.com/image.jpg"
            className="input"
          />
        </Field>
      </section>

      {/* Ошибка */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Кнопки */}
      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
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

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgb(59 130 246 / 10%);
        }
      `}</style>
    </form>
  );
}

// Вспомогательный компонент поля
function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      {children}
    </label>
  );
}
