import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { myEmitter } from '../services/eventEmitter';

const paymentInformationSchema = new mongoose.Schema(
  {
    paymentType: {
      type: String,
      enum: ['bank', 'paypal', 'other'],
      required: true,
    },
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
    paypalEmail: String,
    paymentDescription: String,
  },
  { _id: false },
);

const subcontractorSchema = new mongoose.Schema(
  {
    isPasswordSet: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
    },
    fullName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
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
    // Password setup fields (unified with User and Accountant models)
    passwordSetupToken: String,
    passwordSetupTokenExpiry: Date,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
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

// Pre-save hook to hash password if modified (similar to User model)
subcontractorSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

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
