import mongoose from "mongoose";

const UserActivityTrackerSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['login', 'tool_usage', 'signup'] },
    tool: String,
    action: String
}, { timestamps: true });

export const UserActivityTracker = mongoose.model("UserActivityTracker", UserActivityTrackerSchema);