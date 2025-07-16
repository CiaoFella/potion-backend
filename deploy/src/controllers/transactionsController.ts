import { predictCategory, Transaction } from "../models/Transaction";
import csv from "csv-parser";
import fs from "fs";
import mongoose from "mongoose";

const parseAmount = (amount: string) => {
  if (typeof amount === "string") {
    return parseFloat(amount.replace(/[^0-9.-]+/g, ""));
  }
  return amount;
};

export const transactionController = {
  async createTransaction(req: any, res: any) {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[createTransaction] Using userId:", userId);

      const transaction = new Transaction({
        ...req.body,
        createdBy: userId,
      });
      await transaction.save();
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async uploadCSV(req: any, res: any) {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[uploadCSV] Using userId:", userId);

      const results: any = [];
      const errors: any = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (data) => {
          try {
            if (!data.Date && !data.Amount) return;

            let date = data.Date.split("/");

            const transaction = {
              date: new Date(date[2] + "-" + date[0] + "-" + date[1]),
              type: data["Transaction Type"] || "Expense",
              amount: parseAmount(data.Amount),
              description: data["Memo/Description"],
              bankAccount: data.Account,
              counterparty: data.Name ?? "Unknown",
              category: data.Category || data.Split,
              createdBy: userId,
            };

            results.push(transaction);
          } catch (error: any) {
            errors.push({
              row: data,
              error: error.message,
            });
          }
        })
        .on("end", async () => {
          try {
            if (results.length > 0) {
              await Transaction.insertMany(results);
            }

            fs.unlinkSync(req.file.path);

            res.status(201).json({
              message: `${results.length} transactions imported`,
              errors: errors.length > 0 ? errors : null,
            });
          } catch (error: any) {
            res.status(400).json({
              error: error.message,
              errors,
            });
          }
        });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async updateTransaction(req: any, res: any) {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[updateTransaction] Using userId:", userId);

      const updateData = { ...req.body };
      if (updateData.amount) {
        updateData.amount = parseAmount(updateData.amount);
      }

      const transaction = await Transaction.findOneAndUpdate(
        { _id: req.params.id, createdBy: userId },
        { ...updateData, isUserConfirmed: updateData.isUserConfirmed || updateData.category ? true : false },
        { new: true, runValidators: true }
      );

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (updateData.category || updateData?.description) {
        await predictCategory(transaction);
      }

      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async deleteTransaction(req: any, res: any) {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[deleteTransaction] Using userId:", userId);

      const transaction = await Transaction.findOneAndDelete({
        _id: req.params.id,
        createdBy: userId,
      });
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json({ message: "Transaction deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getTransactions(req: any, res: any) {
    try {
      const {
        startDate,
        endDate,
        type,
        category,
        project,
        minAmount,
        maxAmount,
        search,
        client,
      } = req.query;

      // Directly use the X-User-ID header value for createdBy
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;

      console.log("[Transactions] X-User-ID header:", req.header("X-User-ID"));
      console.log("[Transactions] Query with userId:", userId);
      console.log("[Transactions] User object:", req.user);
      console.log("[Transactions] Is accountant:", req.isAccountant);

      const query: any = { createdBy: userId };

      // Add filters
      if (startDate) query.date = { $gte: new Date(startDate) };
      if (endDate) query.date = { ...query.date, $lte: new Date(endDate) };
      if (type) query.type = type;
      if (category) query.category = category;
      if (project) query.project = project;
      if (minAmount) query.amount = { $gte: parseFloat(minAmount) };
      if (maxAmount)
        query.amount = { ...query.amount, $lte: parseFloat(maxAmount) };
      if (search) {
        query.$or = [
          { description: { $regex: search, $options: "i" } },
          { counterparty: { $regex: search, $options: "i" } },
        ];
      }
      if (client) {
        query.project = { $in: await mongoose.model('Project').find({ client: client }).distinct('_id') };
      }

      console.log("[Transactions] Final query:", JSON.stringify(query));

      const transactions = await Transaction.find(query)
        .populate("invoice", "invoiceNumber total status")
        .populate("project", "name")
        .sort({ date: -1 })
        .limit(req.query.limit ? parseInt(req.query.limit) : 100);

      console.log("[Transactions] Found:", transactions.length);
      res.json(transactions);
    } catch (error: any) {
      console.error("[Transactions] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  getTransactionById: async (req: any, res: any) => {
    try {
      // Use X-User-ID header if available
      const userId = req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getTransactionById] Using userId:", userId);

      const transaction = await Transaction.findOne({
        _id: req.params.id,
        createdBy: userId
      });

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error: any) {
      console.error("[getTransactionById] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },
};
