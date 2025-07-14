import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Chat = mongoose.model("Chat", ChatSchema);
