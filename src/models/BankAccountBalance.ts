import mongoose from "mongoose";

const bankAccountBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plaidItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlaidItem",
      required: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    institutionName: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      required: true,
    },
    mask: {
      type: String,
      required: true,
    },
    // Beginning balance for accurate calculations
    beginningBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    beginningBalanceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Current calculated balance
    currentBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    // Last transaction date used in balance calculation
    lastTransactionDate: {
      type: Date,
      default: null,
    },
    // Balance calculation metadata
    calculationMetadata: {
      totalTransactions: {
        type: Number,
        default: 0,
      },
      totalIncome: {
        type: Number,
        default: 0,
      },
      totalExpenses: {
        type: Number,
        default: 0,
      },
      lastCalculationDate: {
        type: Date,
        default: Date.now,
      },
      calculationMethod: {
        type: String,
        enum: ["transaction_flow", "plaid_sync", "manual_adjustment"],
        default: "transaction_flow",
      },
    },
    // Historical balance snapshots for time period analysis
    historicalSnapshots: [
      {
        date: {
          type: Date,
          required: true,
        },
        balance: {
          type: Number,
          required: true,
        },
        transactionCount: {
          type: Number,
          default: 0,
        },
        snapshotType: {
          type: String,
          enum: ["daily", "weekly", "monthly", "sync", "manual"],
          default: "daily",
        },
      },
    ],
    // Reconciliation data
    reconciliation: {
      status: {
        type: String,
        enum: ["reconciled", "needs_attention", "critical"],
        default: "reconciled",
      },
      lastReconciliationDate: {
        type: Date,
        default: null,
      },
      discrepancyCount: {
        type: Number,
        default: 0,
      },
      plaidBalance: {
        type: Number,
        default: null,
      },
      balanceDifference: {
        type: Number,
        default: 0,
      },
    },
    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    currency: {
      type: String,
      default: "USD",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
bankAccountBalanceSchema.index({ userId: 1, accountId: 1 }, { unique: true });
bankAccountBalanceSchema.index({ userId: 1, plaidItemId: 1 });
bankAccountBalanceSchema.index({ lastTransactionDate: -1 });
bankAccountBalanceSchema.index({ "historicalSnapshots.date": -1 });

// Define interface for the document methods
interface IBankAccountBalance extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  plaidItemId: mongoose.Types.ObjectId;
  accountId: string;
  institutionName: string;
  accountName: string;
  accountType: string;
  mask: string;
  beginningBalance: number;
  beginningBalanceDate: Date;
  currentBalance: number;
  lastTransactionDate?: Date;
  calculationMetadata: {
    totalTransactions: number;
    totalIncome: number;
    totalExpenses: number;
    lastCalculationDate: Date;
    calculationMethod: "transaction_flow" | "plaid_sync" | "manual_adjustment";
  };
  historicalSnapshots: Array<{
    date: Date;
    balance: number;
    transactionCount: number;
    snapshotType: "daily" | "weekly" | "monthly" | "sync" | "manual";
  }>;
  reconciliation: {
    status: "reconciled" | "needs_attention" | "critical";
    lastReconciliationDate?: Date;
    discrepancyCount: number;
    plaidBalance?: number;
    balanceDifference: number;
  };
  isActive: boolean;
  currency: string;
  addSnapshot(
    balance: number,
    transactionCount: number,
    snapshotType?: string
  ): void;
  getBalanceForDateRange(startDate: Date, endDate: Date): any[];
}

// Method to add historical snapshot
bankAccountBalanceSchema.methods.addSnapshot = function (
  balance: number,
  transactionCount: number,
  snapshotType: string = "daily"
) {
  this.historicalSnapshots.push({
    date: new Date(),
    balance,
    transactionCount,
    snapshotType,
  });

  // Keep only last 365 snapshots to prevent unlimited growth
  if (this.historicalSnapshots.length > 365) {
    this.historicalSnapshots = this.historicalSnapshots.slice(-365);
  }
};

// Method to get balance for specific date range
bankAccountBalanceSchema.methods.getBalanceForDateRange = function (
  startDate: Date,
  endDate: Date
) {
  const snapshots = this.historicalSnapshots
    .filter(
      (snapshot) => snapshot.date >= startDate && snapshot.date <= endDate
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return snapshots;
};

export const BankAccountBalance = mongoose.model<IBankAccountBalance>(
  "BankAccountBalance",
  bankAccountBalanceSchema
);
