import { accountId } from './../../node_modules/aws-sdk/clients/health.d';
import { Request, Response } from "express";
import { PlaidService } from "../services/plaidService";
import { PlaidItem } from "../models/PlaidItem";
import { Transaction } from "../models/Transaction";
import { BalanceCalculationService } from "../services/balanceCalculationService";

export const plaidController = {
  async createLinkToken(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.body;
      // Use X-User-ID header if available
      const userId =  
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[createLinkToken] Using userId:", userId);
      console.log('zLdZGnnk6LsZkP4n47XlIKpkE1JJdJHlN53J4', itemId)
  
      const plaidItem = await PlaidItem.find({ userId: userId });

      plaidItem.map((item) => console.log(item.itemId))

      console.log("plaidItem", plaidItem.length);
      
      
      const linkToken = await PlaidService.createLinkToken(userId, req.body.existingToken as string ?? '');
      
      
      
      res.json(linkToken);
    } catch (error: any) {
      console.error("[createLinkToken] Error:", error.message);
      res.status(400).json({ error: error.message });
    }
  },

  async exchangePublicToken(req: Request, res: Response): Promise<void> {
    try {
      // Use X-User-ID header if available
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[exchangePublicToken] Using userId:", userId);

      const { public_token } = req.body;
      const plaidItem = await PlaidService.exchangePublicToken(
        public_token,
        userId
      );
      res.json(plaidItem);
    } catch (error: any) {
      console.error("[exchangePublicToken] Error:", error.message);

      // Check if it's a PRODUCT_NOT_READY error
      if (error.response?.data?.error_code === "PRODUCT_NOT_READY") {
        res.status(200).json({
          message:
            "The requested product is not yet ready. Please try again later.",
          status: "pending",
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
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getPlaidItems] Using userId:", userId);

      const plaidItems = await PlaidItem.find({ userId: userId });
      console.log(
        `[getPlaidItems] Found ${plaidItems.length} items for user ${userId}`
      );

      // Get calculated balances for all accounts
      try {
        const accountBalances =
          await BalanceCalculationService.getUserAccountBalances(userId);

        // Merge balance information with Plaid items
        const itemsWithBalances = plaidItems.map((item) => {
          const accountsWithBalances = item.accounts.map((account) => {
            const balanceInfo = accountBalances.find(
              (balance) => balance.accountId === account.accountId
            );

            return {
              ...account.toObject(),
              balance: balanceInfo?.balance || 0,
              reconciliationStatus:
                balanceInfo?.reconciliationStatus || "needs_attention",
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
        console.warn("[getPlaidItems] Error getting balances:", balanceError);
        // Return Plaid items without balance information if balance calculation fails
        res.json(plaidItems);
      }
    } catch (error: any) {
      console.error("[getPlaidItems] Error:", error.message);
      res.status(400).json({ error: error.message });
    }
  },

  async syncTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { plaidItemId } = req.params;
      // Use X-User-ID header if available
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[syncTransactions] Using userId:", userId);

      // Verify the plaid item belongs to the user
      const plaidItem = await PlaidItem.findOne({
        _id: plaidItemId,
        userId: userId,
      });

      if (!plaidItem) {
        res
          .status(404)
          .json({ error: "Plaid item not found or access denied" });
        return;
      }

      const count = await PlaidService.syncTransactions(plaidItemId);
      res.json({ message: `Synced ${count} transactions` });
    } catch (error: any) {
      console.error("[syncTransactions] Error:", error.message);
      res.status(400).json({ error: error.message });
    }
  },

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      await PlaidService.handleWebhook(req.body);
      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).json({ error: error.message });
    }
  },

  async deletePlaidItem(req: Request, res: Response): Promise<void> {
    try {
      // Use X-User-ID header if available
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[deletePlaidItem] Using userId:", userId);

      const { plaidItemId } = req.params;
      // delete all transactions associated with the plaid item
      let plaidItem = await PlaidItem.findOne({
        accounts: { $elemMatch: { accountId: plaidItemId } },
        userId: userId,
      });

      if (!plaidItem) {
        res.status(404).json({ error: "Plaid item not found" });
        return;
      }

      //    find the account from accounts array
      const account = plaidItem.accounts.find(
        (account: any) => account.accountId === plaidItemId
      );

      // delete all transactions associated with the account
      await Transaction.deleteMany({ bankAccount: account.accountId });

      // remove the account from the accounts array
      await PlaidItem.findByIdAndUpdate(plaidItem._id, {
        $pull: { accounts: { accountId: plaidItemId } },
      });

      res.json({ message: "Plaid item deleted successfully" });
    } catch (error: any) {
      console.error("[deletePlaidItem] Error:", error.message);
      res.status(400).json({ error: error.message });
    }
  },
};
