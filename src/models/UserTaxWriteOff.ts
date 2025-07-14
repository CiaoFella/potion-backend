// models/UserTaxWriteOff.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUserTaxWriteOff extends Document {
  user: mongoose.Types.ObjectId;
  savingAmount: number;
  transactionAmount: number;
  transaction: mongoose.Types.ObjectId;
  oldCategory: string;
  newCategory: string;
  createdAt: Date;
}

const UserTaxWriteOffSchema: Schema<IUserTaxWriteOff> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    savingAmount: { type: Number, required: true },
    transactionAmount: { type: Number, required: true},
    transaction: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true },
    oldCategory: { type: String, required: true },
    newCategory: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const UserTaxWriteOff = mongoose.model<IUserTaxWriteOff>('UserTaxWriteOff', UserTaxWriteOffSchema);
export default UserTaxWriteOff;
