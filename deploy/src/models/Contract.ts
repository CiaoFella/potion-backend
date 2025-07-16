import mongoose from "mongoose";
import { myEmitter } from "../services/eventEmitter";

const contractSchema = new mongoose.Schema(
  {
    type: String,
    documentName: String,
    recipients: [String],
    contractEmail: String,
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    clientAddress: String,
    party: {
      name: String,
      entityType: String,
      address: String,
    },
    partySign: String,
    clientSign: String,
    amount: { type: Number },
    status: {
      type: String,
      // enum: ["Sent", "Expired", "Views", "Completed", "Draft"],
      default: "Draft",
    },
    issueDate: Date,
    dueDate: Date,
    responsibilities: String,
    clientResponsibilities: String,
    deliverables: String,
    exclusions: String,
    estimate: [
      {
        currency: String,
        name: String,
        qty: Number,
        unitCost: Number,
        amount: Number,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deleted: { type: Boolean, default: false },
    rawContent: { type: String },
    logo: {
      fileDisplayName: { type: String },
      fileName: { type: String },
      fileType: { type: String },
    },
  },
  { timestamps: true }
);

const actionHandler = (doc, type="update") =>{
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'contracts',
    documentId: doc._id,
    userId: doc.createdBy
  });
}
contractSchema.post("save", actionHandler);
contractSchema.post("updateOne", actionHandler);
contractSchema.post("findOneAndUpdate", actionHandler);

export const Contract = mongoose.model("Contract", contractSchema);
