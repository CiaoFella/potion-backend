import mongoose from "mongoose";
import { myEmitter } from "../services/eventEmitter";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    companyName: String,
    entityType: String,
    address: String,
    currency: String,
    language: String,
    contacts: [
      {
        name: String,
        email: String,
        phone: String,
        countryCode: String,
      },
    ],
    contracts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contract",
      },
    ],
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
    status: {
      type: String,
      enum: ["Lead", "Active Client", "Inactive/Lost"],
      default: "Lead",
    },
    state: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const actionHandler = (doc, type="update") =>{
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'clients',
    documentId: doc._id,
    userId: doc.createdBy
  });
}
clientSchema.post("save", actionHandler);
clientSchema.post("updateOne", actionHandler);
clientSchema.post("findOneAndUpdate", actionHandler);

export const Client = mongoose.model("Client", clientSchema);
