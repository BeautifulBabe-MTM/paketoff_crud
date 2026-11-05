
import mongoose, { Schema, Model } from "mongoose";

const printOptionSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      match: /^\d+x\d+$/,
    },
    quantity: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    currency: {
      type: String,
      required: true,
    },
    price: {
      type: [
        {
          minQty: {
            type: Number,
            required: true,
            min: 1,
          },
          price: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      validate: {
        validator: (arr: { minQty: number }[]) => {
          const seen = new Set<number>();

          return arr.every((p) => {
            if (seen.has(p.minQty)) return false;
            seen.add(p.minQty);
            return true;
          });
        },
        message: "Количество каждой ценовой категории должно быть уникальным.",
      },
      required: true,
    },
    description: {
      type: String,
      default: "",
      required: true,
    },
    tags: {
      type: [String],
      index: true,
      default: [],
      required: false,
    },
    type: {
      type: String,
      required: false,
      trim: true,
    },
    weight: {
      type: String,
      required: false,
    },
    color: {
      type: String,
      required: true,
    },
    appMethod: {
      type: String,
      required: false,
    },
    material: {
      type: String,
      required: false,
    },
    bottom: {
      type: Boolean,
      required: false,
    },
    handle: {
      type: Boolean,
      required: false,
    },
    handleColor: {
      type: String,
      required: false,
    },
    density: {
      type: String,
      required: false,
    },
    size: {
      type: String,
      required: true,
    },
    docsPocket: {
      type: Boolean,
      required: false,
    },
    stickyAss: {
      type: Boolean,
      required: false,
    },
    window: {
      type: Boolean,
      required: false,
    },
    zipLock: {
      type: Boolean,
      required: false,
    },
    images: {
      type: [String],
      validate: {
        validator: (arr: string[]) => {
          if (!Array.isArray(arr)) return false;

          return arr.every((v) =>
            /^https?:\/\/.+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(v)
          );
        },
        message: "Один или несколько URL не являются допустимыми ссылками на изображение.",
      },
    },
    printOptions: {
      type: [printOptionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Product: Model<any> =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);

export default Product;
