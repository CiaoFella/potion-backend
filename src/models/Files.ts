import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    file: {
      fileName: { type: String },
      fileType: { type: String },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const File = mongoose.model("File", FileSchema);
