import mongoose from "mongoose";

// Schema for accountant profile (main account)
const accountantSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true
        },
        password: {
            type: String
        },
        lastLogin: {
            type: Date
        },
        // Array of user accounts this accountant has access to
        userAccesses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserAccountantAccess"
        }]
    },
    { timestamps: true }
);

// Schema for the relationship between accountants and users
const userAccountantAccessSchema = new mongoose.Schema(
    {
        accountant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Accountant",
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        accessLevel: {
            type: String,
            enum: ["read", "edit"],
            default: "read",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "active", "deactivated"],
            default: "pending"
        },
        inviteToken: {
            type: String
        },
        inviteTokenExpiry: {
            type: Date
        }
    },
    { timestamps: true }
);

// Ensure we can't have duplicate accountant-user relationships
userAccountantAccessSchema.index({ accountant: 1, user: 1 }, { unique: true });

export const Accountant = mongoose.model("Accountant", accountantSchema);
export const UserAccountantAccess = mongoose.model("UserAccountantAccess", userAccountantAccessSchema); 