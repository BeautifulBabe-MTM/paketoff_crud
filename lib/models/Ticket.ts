
import mongoose, { Schema, Model } from "mongoose";

const messageSchema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },
    direction: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ticketSchema = new Schema(
  {
    ticketNumber: {
      type: Number,
      unique: true,
    },
    from: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    body: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["awaiting reply", "answered", "archived"],
      default: "awaiting reply",
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: false }
);

const Ticket: Model<any> =
  mongoose.models.Ticket ||
  mongoose.model("Ticket", ticketSchema);

export default Ticket;
