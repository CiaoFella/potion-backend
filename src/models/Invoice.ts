import mongoose from "mongoose";
import { myEmitter } from "../services/eventEmitter";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    items: [
      {
        name: String,
        quantity: Number,
        unitPrice: Number,
        amount: Number,
      },
    ],
    subtotal: Number,
    tax: {
      percentage: Number,
      name: String,
    },
    total: Number,
    currency: String,
    issueDate: Date,
    dueDate: Date,
    status: {
      type: String,
      // enum: ["Draft", "Paid", "Past Due", "Sent", "Open"],
      default: "Draft",
    },
    showProject: {
      type: Boolean,
      default: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    rawText: { type: String },
    paymentDetails: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const actionHandler = (doc, type="update") =>{
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'invoices',
    documentId: doc._id,
    userId: doc.createdBy
  });
}
invoiceSchema.post("save", actionHandler);
invoiceSchema.post("updateOne", actionHandler);
invoiceSchema.post("findOneAndUpdate", actionHandler);
export const Invoice = mongoose.model("Invoice", invoiceSchema);
