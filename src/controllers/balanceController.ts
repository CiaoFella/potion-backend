import { Request, Response } from "express";
import { BalanceCalculationService } from "../services/balanceCalculationService";
import { BankAccountBalance } from "../models/BankAccountBalance";

export const balanceController = {
  /**
   * Get all account balances for a user
   */
  async getUserBalances(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      console.log("[getUserBalances] Using userId:", userId);

      const balances =
        await BalanceCalculationService.getUserAccountBalances(userId);
      res.json(balances);
    } catch (error: any) {
      console.error("[getUserBalances] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Calculate balance for a specific account
   */
  async calculateAccountBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      const { accountId } = req.params;
      const {
        startDate,
        endDate,
        forceRecalculation = false,
        includeHistoricalSnapshots = false,
        reconcileWithPlaid = true,
      } = req.query;

      console.log(
        `[calculateAccountBalance] Calculating balance for account ${accountId}, user ${userId}`
      );

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        forceRecalculation: forceRecalculation === "true",
        includeHistoricalSnapshots: includeHistoricalSnapshots === "true",
        reconcileWithPlaid: reconcileWithPlaid === "true",
      };

      const result = await BalanceCalculationService.calculateAccountBalance(
        userId,
        accountId,
        options
      );

      res.json(result);
    } catch (error: any) {
      console.error("[calculateAccountBalance] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Calculate balances for all user accounts
   */
  async calculateAllUserBalances(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      const {
        startDate,
        endDate,
        forceRecalculation = false,
        includeHistoricalSnapshots = false,
        reconcileWithPlaid = true,
      } = req.query;

      console.log(
        `[calculateAllUserBalances] Calculating balances for all accounts for user ${userId}`
      );

      const options = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        forceRecalculation: forceRecalculation === "true",
        includeHistoricalSnapshots: includeHistoricalSnapshots === "true",
        reconcileWithPlaid: reconcileWithPlaid === "true",
      };

      const results = await BalanceCalculationService.calculateAllUserBalances(
        userId,
        options
      );

      res.json(results);
    } catch (error: any) {
      console.error("[calculateAllUserBalances] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get balance for a specific date range
   */
  async getBalanceForDateRange(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: "startDate and endDate are required" });
        return;
      }

      console.log(
        `[getBalanceForDateRange] Getting balance for account ${accountId} from ${startDate} to ${endDate}`
      );

      const result = await BalanceCalculationService.getBalanceForDateRange(
        userId,
        accountId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(result);
    } catch (error: any) {
      console.error("[getBalanceForDateRange] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Set beginning balance for an account
   */
  async setBeginningBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      const { accountId } = req.params;
      const { beginningBalance, effectiveDate } = req.body;

      if (typeof beginningBalance !== "number") {
        res.status(400).json({ error: "beginningBalance must be a number" });
        return;
      }

      console.log(
        `[setBeginningBalance] Setting beginning balance for account ${accountId}: $${beginningBalance}`
      );

      const effectiveDateObj = effectiveDate
        ? new Date(effectiveDate)
        : new Date();

      await BalanceCalculationService.setBeginningBalance(
        userId,
        accountId,
        beginningBalance,
        effectiveDateObj
      );

      res.json({
        message: "Beginning balance set successfully",
        accountId,
        beginningBalance,
        effectiveDate: effectiveDateObj,
      });
    } catch (error: any) {
      console.error("[setBeginningBalance] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get balance history for an account
   */
  async getBalanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      const { accountId } = req.params;
      const { startDate, endDate, snapshotType } = req.query;

      console.log(
        `[getBalanceHistory] Getting balance history for account ${accountId}`
      );

      const accountBalance = await BankAccountBalance.findOne({
        userId,
        accountId,
      });

      if (!accountBalance) {
        res.status(404).json({ error: "Account balance record not found" });
        return;
      }

      let snapshots = accountBalance.historicalSnapshots;

      // Filter by date range if provided
      if (startDate || endDate) {
        snapshots = snapshots.filter((snapshot) => {
          const snapshotDate = snapshot.date;
          const afterStart =
            !startDate || snapshotDate >= new Date(startDate as string);
          const beforeEnd =
            !endDate || snapshotDate <= new Date(endDate as string);
          return afterStart && beforeEnd;
        });
      }

      // Filter by snapshot type if provided
      if (snapshotType) {
        snapshots = snapshots.filter(
          (snapshot) => snapshot.snapshotType === snapshotType
        );
      }

      // Sort by date (newest first)
      snapshots = snapshots.sort((a, b) => b.date.getTime() - a.date.getTime());

      res.json({
        accountId,
        currentBalance: accountBalance.currentBalance,
        beginningBalance: accountBalance.beginningBalance,
        historicalSnapshots: snapshots,
        totalSnapshots: snapshots.length,
      });
    } catch (error: any) {
      console.error("[getBalanceHistory] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Force recalculation of balances after transaction changes
   */
  async recalculateBalances(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;
      const { accountId } = req.params;

      console.log(
        `[recalculateBalances] Force recalculating balances for user ${userId}`
      );

      if (accountId) {
        // Recalculate specific account
        const result = await BalanceCalculationService.calculateAccountBalance(
          userId,
          accountId,
          {
            forceRecalculation: true,
            includeHistoricalSnapshots: true,
            reconcileWithPlaid: true,
          }
        );
        res.json(result);
      } else {
        // Recalculate all accounts
        const results =
          await BalanceCalculationService.calculateAllUserBalances(userId, {
            forceRecalculation: true,
            includeHistoricalSnapshots: true,
            reconcileWithPlaid: true,
          });
        res.json(results);
      }
    } catch (error: any) {
      console.error("[recalculateBalances] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get balance reconciliation status
   */
  async getReconciliationStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId =
        req.header("X-User-ID") || req.user?.userId || req.user?.id;

      console.log(
        `[getReconciliationStatus] Getting reconciliation status for user ${userId}`
      );

      const accountBalances = await BankAccountBalance.find({
        userId,
        isActive: true,
      });

      const reconciliationSummary = {
        totalAccounts: accountBalances.length,
        reconciledAccounts: 0,
        needsAttentionAccounts: 0,
        criticalAccounts: 0,
        accounts: accountBalances.map((account) => ({
          accountId: account.accountId,
          institutionName: account.institutionName,
          accountName: account.accountName,
          mask: account.mask,
          reconciliationStatus: account.reconciliation.status,
          discrepancyCount: account.reconciliation.discrepancyCount,
          lastReconciliationDate: account.reconciliation.lastReconciliationDate,
          balanceDifference: account.reconciliation.balanceDifference,
          currentBalance: account.currentBalance,
          plaidBalance: account.reconciliation.plaidBalance,
        })),
      };

      // Count accounts by status
      accountBalances.forEach((account) => {
        switch (account.reconciliation.status) {
          case "reconciled":
            reconciliationSummary.reconciledAccounts++;
            break;
          case "needs_attention":
            reconciliationSummary.needsAttentionAccounts++;
            break;
          case "critical":
            reconciliationSummary.criticalAccounts++;
            break;
        }
      });

      res.json(reconciliationSummary);
    } catch (error: any) {
      console.error("[getReconciliationStatus] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  },
};
