
import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
    {
        contact: {
            name: { type: String, default: "" },
            phone: { type: String, default: "" },
            email: { type: String, default: "" },
        },

        delivery: {
            method: { type: String, default: "" },
            address: { type: String, default: "" },
        },

        cart: [
            {
                name: { type: String, default: "" },
                quantity: { type: Number, default: 0 },
                price: { type: Number, default: 0 },
            },
        ],

        paymentMethod: {
            type: String,
            default: "",
        },

        total: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            default: "new",
            enum: [
                "new",
                "processing",
                "shipped",
                "completed",
                "cancelled",
            ],
        },

        language: {
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

            // Старые поля оставляем для совместимости
            // с уже существующими заказами.
            pathOnDisk: String,
            path: String,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        collection: "orders",
    }
);

const Order =
    mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
