import mongoose from 'mongoose';
import { myEmitter } from '../services/eventEmitter';

// Schema for the relationship between subcontractors and projects (many-to-many)
const subcontractorProjectAccessSchema = new mongoose.Schema(
  {
    subcontractor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcontractor',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // The Potion user who owns this project
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'completed', 'terminated'],
      default: 'invited',
    },
    accessLevel: {
      type: String,
      enum: ['viewer', 'contributor'],
      default: 'contributor',
    },
    inviteKey: {
      type: String,
    },
    inviteExpiry: {
      type: Date,
    },
    // Payment terms specific to this project
    paymentTerms: {
      rate: {
        type: Number,
      },
      currency: {
        type: String,
        default: 'USD',
      },
      paymentSchedule: {
        type: String,
        enum: ['hourly', 'daily', 'weekly', 'monthly', 'project'],
        default: 'hourly',
      },
    },
    // Project-specific role/title
    role: {
      type: String,
      default: 'Contractor',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Ensure we can't have duplicate subcontractor-project relationships
subcontractorProjectAccessSchema.index(
  { subcontractor: 1, project: 1 },
  { unique: true },
);

// Optimize queries
subcontractorProjectAccessSchema.index({ subcontractor: 1, status: 1 });
subcontractorProjectAccessSchema.index({ project: 1, status: 1 });
subcontractorProjectAccessSchema.index({ user: 1, status: 1 });

const actionHandler = (doc, type = 'update') => {
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'subcontractorprojectaccesses',
    documentId: doc._id,
    userId: doc.user,
  });
};

subcontractorProjectAccessSchema.post('save', function (doc) {
  actionHandler(doc, 'update');
});

subcontractorProjectAccessSchema.post('findOneAndUpdate', function (doc) {
  if (doc) actionHandler(doc, 'update');
});

subcontractorProjectAccessSchema.post('findOneAndDelete', function (doc) {
  if (doc) actionHandler(doc, 'delete');
});

export const SubcontractorProjectAccess = mongoose.model(
  'SubcontractorProjectAccess',
  subcontractorProjectAccessSchema,
);
