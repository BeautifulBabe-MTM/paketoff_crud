
"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types/product";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

export default function ProductCard({
  product,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const [showAll, setShowAll] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = product.images ?? [];
  const hasImages = images.length > 0;

  const previousImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Удалить товар "${product.name}"?`
    );

    if (confirmed) {
      onDelete(product._id);
    }
  };

  const characteristics = [
    { label: "Тип", value: product.type },
    { label: "Материал", value: product.material },
    { label: "Цвет", value: product.color },
    { label: "Размер", value: product.size },
    { label: "Плотность", value: product.density },
    { label: "Вес", value: product.weight },
    { label: "Способ нанесения", value: product.appMethod },
    { label: "Цвет ручки", value: product.handleColor },
  ].filter((item) => item.value);

  const features = [
    { label: "Дно", enabled: product.bottom },
    { label: "Ручка", enabled: product.handle },
    { label: "Карман для документов", enabled: product.docsPocket },
    { label: "Липкий клапан", enabled: product.stickyAss },
    { label: "Окно", enabled: product.window },
    { label: "Zip-lock", enabled: product.zipLock },
  ].filter((item) => item.enabled);

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Изображения */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
        {hasImages ? (
          <>
            <Image
              src={images[currentImageIndex]}
              alt={product.name}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={previousImage}
                  aria-label="Предыдущее изображение"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
                >
                  &#10094;
                </button>

                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Следующее изображение"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70"
                >
                  &#10095;
                </button>

                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentImageIndex(index)}
                      aria-label={`Изображение ${index + 1}`}
                      className={`h-2 w-2 rounded-full transition ${currentImageIndex === index
                        ? "bg-white"
                        : "bg-white/50"
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            Нет изображения
          </div>
        )}
      </div>

      {/* Основная информация */}
      <div className="p-4">
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-900">
            {product.name}
          </h2>

          <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
            <span>{product.category}</span>

            {product.subcategory && (
              <>
                <span>·</span>
                <span>{product.subcategory}</span>
              </>
            )}
          </div>
        </div>

        <p className="mb-4 text-sm text-gray-600">
          {product.description || "Описание отсутствует"}
        </p>

        {/* Характеристики */}
        {characteristics.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">
              Характеристики
            </h3>

            <div className="space-y-1">
              {characteristics.map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-gray-500">{item.label}</span>
                  <span className="text-right text-gray-800">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Дополнительные особенности */}
        {features.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {features.map((item) => (
              <span
                key={item.label}
                className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700"
              >
                {item.label}
              </span>
            ))}
          </div>
        )}

        {/* Цены */}
        {product.price?.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-800">
              Цены
            </h3>

            <div className="space-y-1">
              {product.price.map((tier, index) => (
                <div
                  key={`${tier.minQty}-${index}`}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-500">
                    От {tier.minQty} шт.
                  </span>

                  <span className="font-medium text-gray-900">
                    {tier.price} {product.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Цены печати */}
        {product.printOptions?.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Варианты печати
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({product.printOptions.length})
                </span>
              </h3>

              <button
                type="button"
                onClick={() => setShowPrintOptions((prev) => !prev)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                {showPrintOptions ? "Свернуть" : "Показать"}
              </button>
            </div>

            {showPrintOptions && (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                {product.printOptions.map((option, index) => (
                  <div
                    key={`${option.code}-${option.quantity}-${index}`}
                    className="flex justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
                  >
                    <span className="text-gray-500">
                      {option.code} · {option.quantity} шт.
                    </span>

                    <span className="font-medium text-gray-900">
                      {option.price} грн
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Теги */}
        {product.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {(showAll ? product.tags : product.tags.slice(0, 5)).map(
              (tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                >
                  #{tag}
                </span>
              )
            )}

            {product.tags.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showAll ? "Свернуть" : `Ещё ${product.tags.length - 5}`}
              </button>
            )}
          </div>
        )}

        {/* Дата создания */}
        {product.createdAt && (
          <p className="mb-4 text-xs text-gray-400">
            Создано:{" "}
            {new Date(product.createdAt).toLocaleDateString("ru-RU")}
          </p>
        )}

        {/* Управление */}
        <div className="flex gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => onEdit(product)}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Редактировать
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            Удалить
          </button>
        </div>
      </div>
    </article>
  );
}
