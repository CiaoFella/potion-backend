import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['ProfitAndLoss', 'BalanceSheet', 'CashFlow', 'ProjectProfitability'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'error'],
      default: 'pending',
    },
    period: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
      durationType: {
        type: String,
        enum: [
          'monthly',
          'lastmonth',
          'last3months',
          'quarterly',
          'quart1',
          'quart2',
          'quart3',
          'quart4',
          'yearly',
          'lastyear',
          'last2years',
          'ytd',
          'custom',
        ],
        required: true,
      },
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    error: {
      message: String,
      details: mongoose.Schema.Types.Mixed,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    projectIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
ReportSchema.index({ userId: 1, type: 1, 'period.startDate': -1 });
ReportSchema.index({ status: 1 });

export const Report = mongoose.model('Report', ReportSchema);
