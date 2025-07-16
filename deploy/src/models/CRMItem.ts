import mongoose from "mongoose";
import { myEmitter } from "../services/eventEmitter";
import { Transaction } from "./Transaction";
import { getToken } from "../cron/getCRMAction";
const crmItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    companyName: {
      type: String,
    },
    email: {
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CRMCategory",
    },
    description: {
      type: String,
    },
    lastContact: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,

    },
    actionStatus: {
      type: Boolean,
      default: false,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const predictAction = async (doc) => {
  try {
    const token = await getToken(doc.createdBy.toString());

    const response = await fetch(`https://chat.go-potion.com/quick-actions/${doc._id}`, {
      headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();

    // Update CRM item with the new action
    await CRMItem.findByIdAndUpdate(doc._id, {
      action: data[0] // Assuming the API returns an object with an action field
    });
  } catch (error) {
    console.error('Error predicting action:', error);
  }
};

const actionHandler = async (doc, type = "update") => {
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'crm',
    documentId: doc._id,
    userId: doc.createdBy
  });

  if (type === "save") {
    await predictAction(doc);
  }
}
crmItemSchema.post("save", (doc) => actionHandler(doc, "save"));
crmItemSchema.post("updateOne", actionHandler);
crmItemSchema.post("findOneAndUpdate", actionHandler);



export const CRMItem = mongoose.model("CRMItem", crmItemSchema);
