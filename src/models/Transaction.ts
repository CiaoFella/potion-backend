import mongoose from "mongoose";
import { myEmitter } from "../services/eventEmitter";
import fetch from "node-fetch";
import { getToken } from "../cron/getCRMAction";

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Expense", "Income"],
      required: true,
    },
    bankAccount: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: false,
    },
    isUserConfirmed: {
      type: Boolean,
      required: false,
      default: false,
    },
    isExcluded: {
      type: Boolean,
      required: false,
      default: false,
    },
    counterparty: {
      type: String,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
    },
    aiDescription: {
      type: String,
    },
    category: {
      type: String,
      required: false,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cardLastFour: {
      type: String,
      required: false,
    },
    account: {
      type: String
    },
    plaidTransactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    action: {
      type: String,
      enum: ["CategoryAction", "TransactionAction", "InvoiceAction"],
    },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ createdBy: 1, date: -1 });
TransactionSchema.index({ plaidTransactionId: 1 });

export const predictCategory = async (doc) => {
  try {
    // Check if the transaction was created within the last minute
    const creationTime = doc.createdAt.getTime();
    const currentTime = Date.now();
    const isNew = currentTime - creationTime < 60000; // 60000ms = 1 minute

    if (!isNew) {
      return;
    }

    const token = await getToken(doc.createdBy.toString());

    if (!token) {
      console.log("No token found");
      return;
    }

    let url = `https://chat.go-potion.com/transaction-category/${doc._id.toString()}?type=category`;

    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        message: null,
      }),
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(">>", url);
    const prediction = await response.json();
    console.log(">>", prediction);
    console.log(">>", doc._id.toString());
    console.log(">>", token);

    // Find the category with highest confidence
    const bestCategory = prediction?.categories?.reduce((prev, current) =>
      prev.confidence > current.confidence ? prev : current
    );

    // Update category if confidence is high enough
    if (bestCategory && bestCategory?.confidence >= 0.7) {
      await Transaction.findByIdAndUpdate(doc._id.toString(), {
        category: bestCategory.label,
        aiDescription: prediction.description,
      });
    } else {
      await Transaction.findByIdAndUpdate(doc._id.toString(), {
        action: "CategoryAction",
      });
    }
    console.log(
      "Category predicted:",
      bestCategory ? bestCategory.label : "No prediction"
    );
  } catch (error) {
    console.error("Error predicting category:", error);
  }
};

const actionHandler = async (doc, type = "update") => {
  // Emit database change event
  myEmitter.emit("databaseChange", {
    eventType: type,
    collectionName: "transactions",
    documentId: doc._id,
    userId: doc.createdBy,
  });

  // Only predict category on new transactions
  if (type === "save") {
    await predictCategory(doc);
  }
};

TransactionSchema.post("save", (doc) => actionHandler(doc, "save"));
TransactionSchema.post("updateOne", actionHandler);
TransactionSchema.post("findOneAndUpdate", actionHandler);

export const Transaction = mongoose.model("Transaction", TransactionSchema);
