import mongoose from "mongoose";
import { myEmitter } from "../services/eventEmitter";

const paymentInformationSchema = new mongoose.Schema({
  paymentType: {
    type: String,
    enum: ["bank", "paypal", "other"],
    required: true
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
    accountNumber: String
  },
  // PayPal-specific field
  paypalEmail: String,
  // Other payment type
  paymentDescription: String
}, { _id: false });

const subcontractorSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: false
  },
  isPasswordSet: {
    type: Boolean,
    default: false
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
    //required: true,
    //unique: true
  },
  businessName: String,
  note: String,
  country: String,
  isUSCitizen: Boolean,
  taxType: {
    type: String,
    enum: ["individual", "business"]
  },
  paymentInformation: paymentInformationSchema,
  inviteKey: String,
  passkey: String,
  files: {
    type: Object,
    default: {}
  },
  status: {
    type: String,
    enum: ["invited", "active", "inactive"],
    default: "invited"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  deleted: { type: Boolean, default: false }
}, { timestamps: true });

const actionHandler = (doc, type="update") =>{
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'subcontractors',
    documentId: doc._id,
    userId: doc.createdBy
  });
}
subcontractorSchema.post("save", actionHandler);
subcontractorSchema.post("updateOne", actionHandler);
subcontractorSchema.post("findOneAndUpdate", actionHandler);


export const Subcontractor = mongoose.model("Subcontractor", subcontractorSchema);