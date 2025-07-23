import mongoose from 'mongoose';
import { myEmitter } from '../services/eventEmitter';

const paymentInformationSchema = new mongoose.Schema(
  {
    paymentType: {
      type: String,
      enum: ['bank', 'paypal', 'other'],
      required: true,
    },
    // Bank-specific fields
    routingNumber: String,
    swiftCode: String,
    bankName: String,
    bankAddress: String,
    isInternationalAccount: Boolean,
    accountNumber: String,
    accountHolderName: String,
    intermediaryBank: {
      bankName: String,
      swiftCode: String,
      bankAddress: String,
      accountNumber: String,
    },
    // PayPal-specific field
    paypalEmail: String,
    // Other payment type
    paymentDescription: String,
  },
  { _id: false },
);

const subcontractorSchema = new mongoose.Schema(
  {
    // Remove single project constraint - now handled by SubcontractorProjectAccess
    isPasswordSet: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      //required: true,
    },
    fullName: {
      type: String,
      //required: true
    },
    email: {
      type: String,
      required: true,
      unique: true, // Global unique email for multi-project access
    },
    businessName: String,
    note: String,
    country: String,
    isUSCitizen: Boolean,
    taxType: {
      type: String,
      enum: ['individual', 'business'],
    },
    paymentInformation: paymentInformationSchema,
    inviteKey: String,
    passkey: String,
    // Password reset fields
    passwordResetToken: String,
    passwordResetTokenExpiry: Date,
    files: {
      type: Object,
      default: {},
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'inactive'],
      default: 'invited',
    },
    // Keep createdBy for backward compatibility, but it's less important now
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Made optional since they can work for multiple users
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Static method to get active projects for a subcontractor
subcontractorSchema.statics.getActiveProjects = async function (
  subcontractorId,
) {
  const SubcontractorProjectAccess = mongoose.model(
    'SubcontractorProjectAccess',
  );

  return await SubcontractorProjectAccess.aggregate([
    {
      $match: {
        subcontractor: new mongoose.Types.ObjectId(subcontractorId),
        status: 'active',
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'projectData',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userData',
      },
    },
    { $unwind: '$projectData' },
    { $unwind: '$userData' },
    {
      $project: {
        projectId: '$project',
        userId: '$user',
        projectName: '$projectData.name',
        projectDescription: '$projectData.description',
        projectStatus: '$projectData.status',
        clientName: {
          $concat: ['$userData.firstName', ' ', '$userData.lastName'],
        },
        clientEmail: '$userData.email',
        clientBusinessName: '$userData.businessName',
        accessLevel: 1,
        role: 1,
        paymentTerms: 1,
        startDate: 1,
        endDate: 1,
      },
    },
  ]);
};

// Instance method to get active projects for this subcontractor
subcontractorSchema.methods.getActiveProjects = function () {
  return this.constructor.getActiveProjects(this._id);
};

const actionHandler = (doc, type = 'update') => {
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'subcontractors',
    documentId: doc._id,
    userId: doc.createdBy, // This might be null for multi-project subcontractors
  });
};

subcontractorSchema.post('save', function (doc) {
  actionHandler(doc, 'update');
});

subcontractorSchema.post('findOneAndUpdate', function (doc) {
  if (doc) actionHandler(doc, 'update');
});

subcontractorSchema.post('findOneAndDelete', function (doc) {
  if (doc) actionHandler(doc, 'delete');
});

export const Subcontractor = mongoose.model(
  'Subcontractor',
  subcontractorSchema,
);
