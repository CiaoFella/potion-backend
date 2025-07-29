import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { TaxRate } from './TaxRate';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordOTP: String,
    resetPasswordOTPExpiry: Date,
    refreshToken: String,
    isPasswordSet: { type: Boolean, default: false },
    passwordSetupToken: String,
    passwordSetupTokenExpiry: Date,
    signupSource: {
      type: String,
      enum: ['checkout', 'direct'],
      default: 'checkout',
    },
    checkoutSessionId: String,
    // Google OAuth fields
    googleId: String,
    authProvider: {
      type: String,
      enum: ['password', 'google'],
      default: 'password',
    },
    countryCode: String,
    phoneNumber: String,
    language: String,
    timezone: String,
    currency: String,
    country: String,
    city: String,
    street: String,
    state: String,
    postalCode: String,
    address: String,
    businessName: String,
    businessType: String,
    taxId: String,
    paypalEmail: String,
    paymentMethods: [
      {
        id: String,
        type: { type: String, enum: ['bank', 'card'] },
        accountName: String,
        accountNumber: String,
        routingNumber: String,
        cardNumber: String,
        expiryDate: String,
        isDefault: { type: Boolean, default: false },
      },
    ],
    subscription: Object,
    tfa: { type: Boolean, default: false },
    startOfWeek: {
      type: String,
      default: 'Monday',
      enum: ['Monday', 'Sunday'],
    },
    timeFormat: {
      type: String,
      default: '24 hour',
      enum: ['24 hour', '12 hour'],
    },
    dateFormat: {
      type: String,
      default: 'dd/mm/yyyy',
      enum: ['dd/mm/yyyy', 'mm/dd/yyyy', 'yyyy/mm/dd'],
    },
    notifications: {
      indox: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true },
    },
    google: {
      googleDocs: { type: Boolean, default: false },
      googleSheets: { type: Boolean, default: false },
      googleDrive: { type: Boolean, default: false },
    },
    isUserDeleted: { type: Boolean, default: false },
    profilePicture: {
      fileDisplayName: { type: String },
      fileName: { type: String },
      fileType: { type: String },
    },
    isActive: { type: Boolean, default: true },
    currentSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeTracker',
      required: false,
    },
  },
  { timestamps: true },
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.post('save', async function (doc) {
  try {
    // Check if user already has a default tax rate
    const existingDefaultTax = await TaxRate.findOne({
      userId: doc._id,
      isDefault: true,
    });

    // If no default tax rate exists, create one with 0%
    if (!existingDefaultTax) {
      await TaxRate.create({
        userId: doc._id,
        name: 'Default Tax Rate',
        description: 'Default tax rate of 0%',
        type: 'Flat',
        flatRate: 0,
        isDefault: true,
      });
    }
  } catch (error) {
    console.error('Error creating default tax rate:', error);
  }
});

export const User = mongoose.model('User', userSchema);
