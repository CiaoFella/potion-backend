import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    otp: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Admin = mongoose.model("Admin", adminSchema);
