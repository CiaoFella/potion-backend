import { Request, Response } from 'express';
import UserTaxWriteOff from '../models/UserTaxWriteOff';
import { Transaction } from '../models/Transaction';

export const userTaxWriteOffController = {
  async createSingleWriteOff(req, res){
    try {
      const { transactionId, transaction_amount, saving_amount, old_category, new_category } = req.body;

      if (!transactionId || !transaction_amount || !saving_amount || !old_category || !new_category) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const userId = req.header('X-User-ID') || req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      }

      await Transaction.findByIdAndUpdate(transactionId, { category: new_category });

      const newWriteOff = new UserTaxWriteOff({
        user: userId,
        transaction: transactionId,
        transactionAmount: transaction_amount,
        savingAmount: saving_amount,
        oldCategory: old_category,
        newCategory: new_category,
      });

      await newWriteOff.save();

      res.status(201).json({ message: 'Write-off recorded', data: newWriteOff });
    } catch (err) {
      console.error('Error adding write-off:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  async createMultipleWriteOffs(req, res){
    try {
      const writeOffs = req.body;

      if (!Array.isArray(writeOffs) || writeOffs.length === 0) {
        return res.status(400).json({ message: 'Expected an array of write-off records' });
      }

      const userId = req.header('X-User-ID') || req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      }

      const preparedWriteOffs = await Promise.all(
        writeOffs.map(async item => {
          const { transactionId, transaction_amount, saving_amount, old_category, new_category } = item;

          if (!transactionId || !transaction_amount || !saving_amount || !old_category || !new_category) {
            throw new Error('Missing required fields in one or more entries');
          }

          await Transaction.findByIdAndUpdate(transactionId, { category: new_category });

          return {
            user: userId,
            transaction: transactionId,
            transactionAmount: transaction_amount,
            savingAmount: saving_amount,
            oldCategory: old_category,
            newCategory: new_category,
          };
        })
      );

      const result = await UserTaxWriteOff.insertMany(preparedWriteOffs);

      res.status(201).json({ message: 'Write-offs recorded', data: result });
    } catch (err) {
      console.error('Error adding multiple write-offs:', err);
      res.status(500).json({ message: err.message || 'Internal server error' });
    }
  },

  async listUserWriteOffs(req, res){
    try {
      const userId = req.header('X-User-ID') || req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: Missing user ID' });
      }

      const writeOffs = await UserTaxWriteOff.find({ user: userId }).sort({ createdAt: -1 });
      res.status(200).json(writeOffs);
    } catch (err) {
      console.error('Error retrieving write-offs:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },
};
