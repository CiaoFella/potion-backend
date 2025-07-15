import mongoose from "mongoose";

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  resetPasswordOTP: string;
  resetPasswordOTPExpiry: Date;
  refreshToken: string;
}

export interface IProject {
  name: string;
  status: string;
  description: string;
  client: mongoose.Types.ObjectId;
  contracts: [mongoose.Types.ObjectId];
  files: [{ fileDisplayName:string; fileName: string; fileType: string }];
  createdBy: mongoose.Types.ObjectId;
  deleted: Boolean;
}

export interface IClient {
  name: string;
  email: string;
  phone?: string;
  status: "active" | "lead";
}

export interface IContract {
  title: string;
  client: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  status: "draft" | "pending" | "signed";
}

export interface IInvoice {
  number: string;
  client: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  amount: number;
  status: "draft" | "sent" | "paid";
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
