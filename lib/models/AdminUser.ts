import mongoose, { Schema, Model } from "mongoose";

const adminUserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    login: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "manager"],
      default: "manager",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "adminusers",
  }
);

const AdminUser: Model<any> =
  mongoose.models.AdminUser ||
  mongoose.model("AdminUser", adminUserSchema);

export default AdminUser;