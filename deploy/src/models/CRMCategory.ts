import mongoose from "mongoose";
import { myEmitter } from "../services/eventEmitter";

const crmCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String
    },
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
    collectionName: 'crm',
    documentId: doc._id,
    userId: doc.createdBy
  });
}
crmCategorySchema.post("save", actionHandler);
crmCategorySchema.post("updateOne", actionHandler);
crmCategorySchema.post("findOneAndUpdate", actionHandler);


export const CRMCategory = mongoose.model("CRMCategory", crmCategorySchema);
