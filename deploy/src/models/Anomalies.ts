import mongoose from "mongoose";

const AnomaliesSchema = new mongoose.Schema(
    {
        type: ["overview", "transaction"],
        status: ["pending", "resolved", "dismissed"],
        isResolved: { type: Boolean, default: false },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        title: String,
        description: String,
        severity: String,
        ids: [String],
    },
    { timestamps: true }
);

export const Anomalies = mongoose.model("Anomalies", AnomaliesSchema);
