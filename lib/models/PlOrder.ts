
import mongoose, { Schema, type Model } from "mongoose";

const PlOrderSchema = new Schema(
    {
        client: {
            name: { type: String, default: "" },
            phone: { type: String, default: "" },
            email: { type: String, default: "" },
        },

        shipping: {
            country: { type: String, default: "" },
            city: { type: String, default: "" },
            address: { type: String, default: "" },
            zip: { type: String, default: "" },
        },

        items: [
            {
                productId: { type: String, default: "" },
                name: { type: String, default: "" },
                size: { type: String, default: "" },
                print: { type: String, default: "" },
                quantity: { type: Number, default: 0 },
                total: { type: Number, default: 0 },
            },
        ],

        paymentMethod: {
            type: String,
            default: "",
        },

        paymentStatus: {
            type: String,
            default: "PENDING",
        },

        totalSum: {
            type: Number,
            default: 0,
        },

        currency: {
            type: String,
            default: "UAH",
        },

        locale: {
            type: String,
            default: "uk",
        },

        comment: {
            type: String,
            default: "",
        },

        layout: {
            filename: String,
            originalName: String,
            mimeType: String,
            size: Number,

            // Cloudflare R2
            storageKey: String,
            storageProvider: {
                type: String,
                enum: ["r2", "local"],
                default: "local",
            },

            // Совместимость со старым локальным хранилищем
            pathOnDisk: String,
            path: String,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },

        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        collection: "pl_orders",
        strict: false,
    }
);

const PlOrder: Model<any> =
    mongoose.models.PlOrder ||
    mongoose.model("PlOrder", PlOrderSchema);

export default PlOrder;
