import mongoose from "mongoose";
import { myEmitter } from "../services/eventEmitter";

const TimeTrackerSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: false,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    duration: Number,
    date: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

const actionHandler = (doc, type="update") =>{
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'timetrackers',
    documentId: doc._id,
    userId: doc.createdBy
  });
}
TimeTrackerSchema.post("save", actionHandler);
TimeTrackerSchema.post("updateOne", actionHandler);
TimeTrackerSchema.post("findOneAndUpdate", actionHandler);

export const TimeTracker = mongoose.model("TimeTracker", TimeTrackerSchema);
