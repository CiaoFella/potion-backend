import mongoose from "mongoose";
import { IProject } from "../types";
import { myEmitter } from "../services/eventEmitter";

const projectSchema = new mongoose.Schema<IProject>(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      default: "Draft",
    },
    description: String,
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: false,
    },
    contracts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contract",
        required: false,
      },
    ],
    files: [
      {
        fileDisplayName: { type: String },
        fileName: { type: String },
        fileType: { type: String },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

projectSchema.post('save', function (doc) {
  myEmitter.emit('databaseChange', {
    eventType: 'update',
    collectionName: 'projects',
    documentId: doc._id,
    userId: doc.createdBy
  });
});

const actionHandler = (doc, type="update") =>{
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'projects',
    documentId: doc._id,
    userId: doc.createdBy
  });
}
projectSchema.post("save", actionHandler);
projectSchema.post("updateOne", actionHandler);
projectSchema.post("findOneAndUpdate", actionHandler);

export const Project = mongoose.model("Project", projectSchema);
