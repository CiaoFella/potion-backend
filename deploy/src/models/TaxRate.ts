import mongoose from "mongoose";

const TaxBracketSchema = new mongoose.Schema({
    minIncome: {
        type: Number,
        required: true
    },
    maxIncome: {
        type: Number,
        required: false // null means no upper limit
    },
    rate: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
});

const TaxRateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    type: {
        type: String,
        enum: ["Flat", "Progressive"],
        default: "Flat"
    },
    flatRate: {
        type: Number,
        min: 0,
        max: 100,
        required: function () { return this.type === "Flat"; }
    },
    brackets: {
        type: [TaxBracketSchema],
        required: function () { return this.type === "Progressive"; },
        validate: {
            validator: function (brackets: any[]) {
                if (this.type !== "Progressive") return true;
                if (brackets.length === 0) return false;

                // Ensure brackets are in ascending order and don't overlap
                for (let i = 1; i < brackets.length; i++) {
                    if (brackets[i].minIncome <= brackets[i - 1].minIncome) return false;
                    if (brackets[i - 1].maxIncome && brackets[i - 1].maxIncome >= brackets[i].minIncome) return false;
                }
                return true;
            },
            message: "Tax brackets must be in ascending order and not overlap"
        }
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    effectiveDate: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create a compound index for userId and isDefault
TaxRateSchema.index({ userId: 1, isDefault: 1 });

export const TaxRate = mongoose.model("TaxRate", TaxRateSchema); 