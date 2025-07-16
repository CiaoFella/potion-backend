import mongoose from "mongoose";

const userGlobalValuesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    taxWriteOffGoal: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const UserGlobalValues = mongoose.model(
  "UserGlobalValues",
  userGlobalValuesSchema
);