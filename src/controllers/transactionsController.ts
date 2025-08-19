import jwt, { JwtPayload } from 'jsonwebtoken';
import { predictCategory, Transaction } from '../models/Transaction';
import csv from 'csv-parser';
import fs from 'fs';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { UserRoles, UserRoleType } from '../models/UserRoles';
import { config } from '../config/config';

const parseAmount = (amount: string) => {
  if (typeof amount === 'string') {
    return parseFloat(amount.replace(/[^0-9.-]+/g, ''));
  }
  return amount;
};

export const transactionController = {
  async createTransaction(req: any, res: any) {
    try {
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

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
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      const results: any = [];
      const errors: any = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
          try {
            if (!data.Date && !data.Amount) return;

            let date = data.Date.split('/');

            const transaction = {
              date: new Date(date[2] + '-' + date[0] + '-' + date[1]),
              type: data['Transaction Type'] || 'Expense',
              amount: parseAmount(data.Amount),
              description: data['Memo/Description'],
              bankAccount: data.Account,
              counterparty: data.Name ?? 'Unknown',
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
        .on('end', async () => {
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
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      const updateData = { ...req.body };
      if (updateData.amount) {
        updateData.amount = parseAmount(updateData.amount);
      }

      const transaction = await Transaction.findOneAndUpdate(
        { _id: req.params.id, createdBy: userId },
        {
          ...updateData,
          isUserConfirmed:
            updateData.isUserConfirmed || updateData.category ? true : false,
          isExcluded: updateData.isExcluded ?? false,
        },
        { new: true, runValidators: true },
      );

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      if (updateData?.description) {
        predictCategory(transaction);
      }

      res.json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async deleteTransaction(req: any, res: any) {
    try {
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      const transaction = await Transaction.findOneAndDelete({
        _id: req.params.id,
        createdBy: userId,
      });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json({ message: 'Transaction deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async deleteTransactionsByBankAccount(req: any, res: any) {
    const { bankAccountId } = req.params;
    if (!bankAccountId)
      return res.status(400).json({ error: 'Bank account ID is required' });

    try {
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      // Delete all transactions associated with the bank account for this user
      const result = await Transaction.deleteMany({
        bankAccount: bankAccountId,
        createdBy: userId,
      });

      res.json({
        message: `${result.deletedCount} transactions deleted successfully`,
        deletedCount: result.deletedCount,
      });
    } catch (error: any) {
      console.error('[deleteTransactionsByBankAccount] Error:', error.message);
      res.status(400).json({ error: error.message });
    }
  },

  async getOrphanedTransactions(req: any, res: any) {
    try {
      // Use X-User-ID header if available
      const currentUserId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;
      console.log('[getOrphanedTransactions] Using userId:', currentUserId);

      // Get all PlaidItems for this user to find valid bank account IDs
      const plaidItems = await mongoose
        .model('PlaidItem')
        .find({ userId: currentUserId });
      const validBankAccountIds = plaidItems.flatMap((item) =>
        item.accounts.map((account) => account.accountId),
      );

      console.log(
        '[getOrphanedTransactions] Valid bank account IDs:',
        validBankAccountIds,
      );

      // Find transactions that don't have valid bank accounts
      const orphanedTransactions = await Transaction.find({
        createdBy: currentUserId,
        $or: [
          { bankAccount: { $nin: validBankAccountIds } },
          { bankAccount: { $exists: false } },
        ],
      })
        .populate('invoice', 'invoiceNumber total status')
        .populate('project', 'name')
        .sort({ date: -1 });

      res.json({
        message: `Found ${orphanedTransactions.length} orphaned transactions`,
        count: orphanedTransactions.length,
        transactions: orphanedTransactions,
        validBankAccountIds: validBankAccountIds,
      });
    } catch (error: any) {
      console.error('[getOrphanedTransactions] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  },

  async deleteOrphanedTransactions(req: any, res: any) {
    try {
      // Use X-User-ID header if available
      const currentUserId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;
      console.log('[deleteOrphanedTransactions] Using userId:', currentUserId);

      // Get all PlaidItems for this user to find valid bank account IDs
      const plaidItems = await mongoose
        .model('PlaidItem')
        .find({ userId: currentUserId });
      const validBankAccountIds = plaidItems.flatMap((item) =>
        item.accounts.map((account) => account.accountId),
      );

      console.log(
        '[deleteOrphanedTransactions] Valid bank account IDs:',
        validBankAccountIds,
      );

      // Delete transactions that don't have valid bank accounts
      const result = await Transaction.deleteMany({
        createdBy: currentUserId,
        $or: [
          { bankAccount: { $nin: validBankAccountIds } },
          { bankAccount: { $exists: false } },
        ],
      });

      res.json({
        message: `${result.deletedCount} orphaned transactions deleted successfully`,
        deletedCount: result.deletedCount,
        validBankAccountIds: validBankAccountIds,
      });
    } catch (error: any) {
      console.error('[deleteOrphanedTransactions] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  },
  async getTransactions(
    req: Request<
      {},
      {},
      {},
      {
        startDate?: string;
        endDate?: string;
        type?: string;
        category?: string;
        project?: string;
        minAmount?: string;
        maxAmount?: string;
        search?: string;
        client?: string;
        limit?: string;
      }
    >,
    res: Response
  ) {
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

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

      // Determine which user's transactions to fetch
      const targetUserId = decoded.roleType === UserRoleType.ACCOUNTANT
        ? req.header('X-Businessowner-ID')
        : decoded.userId;

      if (!targetUserId) {
        return res.status(400).json({
          error: 'Missing user ID'
        });
      }

      // If accountant, verify they have access to this user's data
      if (decoded.roleType === UserRoleType.ACCOUNTANT) {
        const hasAccess = await UserRoles.findOne({
          user: decoded.userId,
          businessOwner: targetUserId,
          roleType: UserRoleType.ACCOUNTANT,
          status: 'active',
          deleted: { $ne: true }
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'You do not have access to this user\'s transactions'
          });
        }
      }

      // Build query
      const query: Record<string, any> = { createdBy: targetUserId };

      // Add date filters
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }
      if (type) query.type = type;
      if (category) query.category = category;
      if (project) query.project = project;
      if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = parseFloat(minAmount);
        if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
      }

      if (search) {
        query.$or = [
          { description: { $regex: search, $options: 'i' } },
          { counterparty: { $regex: search, $options: 'i' } },
        ];
      }

      if (client) {
        query.project = {
          $in: await mongoose
            .model('Project')
            .find({ client })
            .distinct('_id'),
        };
      }

      // Execute query with pa gination
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const transactions = await Transaction.find(query)
        .populate('invoice', 'invoiceNumber total status')
        .populate('project', 'name')
        .sort({ date: -1 })
        .limit(limit);

      res.json(transactions);

    } catch (error) {
      console.error('[getTransactions] Error:', error);

      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }

      res.status(500).json({
        error: 'An error occurred while fetching transactions'
      });
    }
  },

  getTransactionById: async (req: any, res: any) => {
    try {
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      const transaction = await Transaction.findOne({
        _id: req.params.id,
        createdBy: userId,
      });

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error: any) {
      console.error('[getTransactionById] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  },
};
