import jwt from 'jsonwebtoken';
import { tests } from './../../node_modules/tsconfig-paths/src/__tests__/data/match-path-data';
import { accountId } from './../../node_modules/aws-sdk/clients/health.d';
import e, { Request, Response } from 'express';
import { PlaidService } from '../services/plaidService';
import { PlaidItem } from '../models/PlaidItem';
import { Transaction } from '../models/Transaction';
import { BalanceCalculationService } from '../services/balanceCalculationService';
import { plaidClient } from '../config/plaid';
import { config } from '../config/config';
import { UserRoles, UserRoleType } from '../models/UserRoles';

export const plaidController = {
  async createLinkToken(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.body;
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      const plaidItem = await PlaidItem.find({ userId: userId });
      let existingToken = '';

      plaidItem.find(async (item) => {
        item.accounts.find((accounts) => {
          if (accounts?.accountId === itemId) {
            existingToken = item.accessToken;
          }
        });
      });

      const linkToken = await PlaidService.createLinkToken(
        userId,
        existingToken,
      );

      res.json(linkToken);
    } catch (error: any) {
      console.error('[createLinkToken] Error:', error.message);
      res.status(400).json({ error: error.message });
    }
  },

  async exchangePublicToken(req: Request, res: Response): Promise<void> {
    try {
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      const { public_token } = req.body;
      const plaidItem = await PlaidService.exchangePublicToken(
        public_token,
        userId,
      );
      res.json(plaidItem);
    } catch (error: any) {
      console.error('[exchangePublicToken] Error:', error.message);

      // Check if it's a PRODUCT_NOT_READY error
      if (error.response?.data?.error_code === 'PRODUCT_NOT_READY') {
        res.status(200).json({
          message:
            'The requested product is not yet ready. Please try again later.',
          status: 'pending',
        });
        return;
      }

      res.status(400).json({ error: error.message });
    }
  },

  async getPlaidItems(req: Request, res: Response): Promise<void> {
    try {
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      const plaidItems = await PlaidItem.find({ userId: userId });

      // Get calculated balances for all accounts
      try {
        const accountBalances =
          await BalanceCalculationService.getUserAccountBalances(userId);

        // Merge balance information with Plaid items
        const itemsWithBalances = plaidItems.map((item) => {
          const accountsWithBalances = item.accounts.map((account) => {
            const balanceInfo = accountBalances.find(
              (balance) => balance.accountId === account.accountId,
            );

            return {
              ...account.toObject(),
              balance: balanceInfo?.balance || 0,
              reconciliationStatus:
                balanceInfo?.reconciliationStatus || 'needs_attention',
              discrepancyCount: balanceInfo?.discrepancyCount || 0,
              lastSync: balanceInfo?.lastSync || null,
            };
          });

          return {
            ...item.toObject(),
            accounts: accountsWithBalances,
          };
        });

        res.json(itemsWithBalances);
      } catch (balanceError) {
        console.warn('[getPlaidItems] Error getting balances:', balanceError);
        // Return Plaid items without balance information if balance calculation fails
        res.json(plaidItems);
      }
    } catch (error: any) {
      console.error('[getPlaidItems] Error:', error.message);
      res.status(400).json({ error: error.message });
    }
  },

  async syncTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { plaidItemId } = req.params;
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      // Verify the plaid item belongs to the user
      const plaidItem = await PlaidItem.findOne({
        _id: plaidItemId,
        userId: userId,
      });

      if (!plaidItem) {
        res
          .status(404)
          .json({ error: 'Plaid item not found or access denied' });
        return;
      }

      const count = await PlaidService.syncTransactions(plaidItemId);
      res.json({
        message: `Synced ${count} transactions`,
        newTransactionsCount: count,
      });
    } catch (error: any) {
      console.error('[syncTransactions] Error:', error.message);
      res.status(400).json({ error: error.message });
    }
  },

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      await PlaidService.handleWebhook(req.body);
      res.json({ status: 'ok' });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  async deletePlaidItem(req: Request, res: Response): Promise<void> {
    try {
      // Use X-User-ID header if available
      const userId =
        req.header('X-User-ID') || req.user?.userId || req.user?.id;

      const { plaidItemId } = req.params;
      // delete all transactions associated with the plaid item
      let plaidItem = await PlaidItem.findOne({
        accounts: { $elemMatch: { accountId: plaidItemId } },
        userId: userId,
      });

      if (!plaidItem) {
        res.status(404).json({ error: 'Plaid item not found' });
        return;
      }

      //    find the account from accounts array
      const account = plaidItem.accounts.find(
        (account: any) => account.accountId === plaidItemId,
      );

      // Remove the Plaid item if we delete the last account
      if (plaidItem.accounts.length === 1) {
        await PlaidService.removeItem(plaidItem.accessToken);
        await PlaidItem.deleteOne({ _id: plaidItem._id });
      } else {
        // update the plaid item and remove the account from the accounts array
        const updatedItem = await PlaidItem.findByIdAndUpdate(plaidItem._id, {
          $pull: { accounts: { accountId: plaidItemId } },
        });
      }

      // delete all transactions associated with the account
      await Transaction.deleteMany({ bankAccount: account.accountId });

      // remove the account from the accounts array
      if (plaidItem.accounts.length > 1) {
        await PlaidItem.findByIdAndUpdate(plaidItem._id, {
          $pull: { accounts: { accountId: plaidItemId } },
        });
      } else {
        await PlaidItem.findByIdAndDelete(plaidItem._id);
      }

      res.json({ message: 'Plaid item deleted successfully' });
    } catch (error: any) {
      console.error('[deletePlaidItem] Error:', error.message);
      res.status(400).json({ error: error.message });
    }
  },

  async updatePlaidItem(req, res): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        roleType?: UserRoleType;
        businessOwnerId?: string;
      };

      const targetUserId = decoded.roleType === UserRoleType.ACCOUNTANT
        ? req.header('X-User-ID') || decoded.businessOwnerId
        : decoded.userId;

      if (!targetUserId) {
        return res.status(400).json({
          error: 'Missing business owner ID. Make sure you\'ve selected a client.'
        });
      }

      // Verify accountant access if applicable
      if (decoded.roleType === UserRoleType.ACCOUNTANT) {
        const hasAccess = await UserRoles.findOne({
          user: decoded.userId,
          businessOwner: targetUserId,
          roleType: UserRoleType.ACCOUNTANT,
          status: 'active'
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'You do not have access to modify this user\'s plaid items'
          });
        }
      }

      const { plaidItemId } = req.params;
      const updateData = req.body;

      if (!plaidItemId || !updateData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Find the plaid item
      let plaidItem = await PlaidItem.findOne({
        accounts: { $elemMatch: { accountId: plaidItemId } },
        userId: targetUserId,
      });

      console.log('Updating Plaid item:', plaidItem);

      if (!plaidItem) {
        return res.status(404).json({ error: 'Plaid item not found' });
      }

      // Find the account index
      const accountIndex = plaidItem.accounts.findIndex(
        account => account.accountId === plaidItemId
      );

      console.log(accountIndex)

      if (accountIndex === -1) {
        return res.status(404).json({ error: 'Account not found in Plaid item' });
      }

      // Update the account with new data
      plaidItem.accounts[accountIndex] = {
        ...plaidItem.accounts[accountIndex],
        ...updateData,
        lastUpdated: new Date()
      };

      await plaidItem.save();

      res.json({
        message: 'Plaid item updated successfully',
        account: plaidItem.accounts[accountIndex]
      });

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }

      console.error('[updatePlaidItem] Error:', error);
      return res.status(500).json({ error: 'Failed to update Plaid item' });
    }
  },

  async getPlaidTransactions(req: Request, res: Response): Promise<any> {
    const { account_id, start_date, end_date, user_id } = req.query;
    if (!account_id || !start_date || !end_date || !user_id) {
      res
        .status(400)
        .json({ error: 'An error occured, please try again later!' });
      return;
    }

    try {
      const plaidItem = await PlaidItem.findOne({
        accounts: { $elemMatch: { accountId: account_id } },
        userId: user_id,
      });

      if (!plaidItem.accessToken) {
        res
          .status(400)
          .json({ error: 'An error occured, please try again later!' });
        return;
      }

      console.log(
        `[getPlaidTransactions] Found Plaiditem for user ${user_id} with accountId ${account_id}`,
      );

      const transactions = await plaidClient.transactionsGet({
        access_token: plaidItem.accessToken,
        start_date: start_date as string,
        end_date: end_date as string,
      });

      res.json({ plaidTransactions: transactions.data });
    } catch (error) {
      console.error('[getPlaidTransactions] Error:', error.message);
      res.status(400).json({ error: error.message });
    }
  },
};
