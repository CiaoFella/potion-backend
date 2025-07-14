import { BankAccountBalance } from "../models/BankAccountBalance";
import { Transaction } from "../models/Transaction";
import { PlaidItem } from "../models/PlaidItem";
import { Types } from "mongoose";
import { plaidClient } from "../config/plaid";

export interface BalanceCalculationOptions {
  startDate?: Date;
  endDate?: Date;
  forceRecalculation?: boolean;
  includeHistoricalSnapshots?: boolean;
  reconcileWithPlaid?: boolean;
}

export interface BalanceCalculationResult {
  accountId: string;
  currentBalance: number;
  beginningBalance: number;
  periodIncome: number;
  periodExpenses: number;
  transactionCount: number;
  lastTransactionDate: Date | null;
  calculationDate: Date;
  historicalSnapshots?: any[];
  reconciliation?: {
    plaidBalance?: number;
    difference?: number;
    status: "reconciled" | "needs_attention" | "critical";
  };
}

export interface DateRangeBalanceResult {
  accountId: string;
  startDate: Date;
  endDate: Date;
  startingBalance: number;
  endingBalance: number;
  periodIncome: number;
  periodExpenses: number;
  netChange: number;
  transactionCount: number;
  dailySnapshots: Array<{
    date: Date;
    balance: number;
    transactions: number;
  }>;
}

export class BalanceCalculationService {
  /**
   * Calculate balance for a specific bank account based on transaction flow
   */
  static async calculateAccountBalance(
    userId: string,
    accountId: string,
    options: BalanceCalculationOptions = {}
  ): Promise<BalanceCalculationResult> {
    try {
      console.log(
        `[BalanceCalculationService] Calculating balance for account ${accountId}, user ${userId}`
      );

      // Get or create bank account balance record
      let accountBalance = await BankAccountBalance.findOne({
        userId,
        accountId,
      });

      if (!accountBalance) {
        // If no balance record exists, create one from PlaidItem data
        const plaidItem = await PlaidItem.findOne({
          userId,
          "accounts.accountId": accountId,
        });

        if (!plaidItem) {
          throw new Error(`No Plaid item found for account ${accountId}`);
        }

        const account = plaidItem.accounts.find(
          (acc) => acc.accountId === accountId
        );
        if (!account) {
          throw new Error(`Account ${accountId} not found in Plaid item`);
        }

        accountBalance = new BankAccountBalance({
          userId,
          plaidItemId: plaidItem._id,
          accountId: account.accountId,
          institutionName: plaidItem.institutionName,
          accountName: account.name,
          accountType: account.type,
          mask: account.mask,
          beginningBalance: 0, // Will be set based on first transaction or manual input
          beginningBalanceDate: new Date(),
        });
      }

      // Build transaction query
      const transactionQuery: any = {
        createdBy: userId,
        bankAccount: accountId,
      };

      // Apply date filters if provided
      if (options.startDate || options.endDate) {
        transactionQuery.date = {};
        if (options.startDate) transactionQuery.date.$gte = options.startDate;
        if (options.endDate) transactionQuery.date.$lte = options.endDate;
      }

      // Get all transactions for the account in date order
      const transactions = await Transaction.find(transactionQuery)
        .sort({ date: 1 })
        .exec();

      console.log(
        `[BalanceCalculationService] Found ${transactions.length} transactions for account ${accountId}`
      );

      // Calculate balance from transaction flow
      let runningBalance = accountBalance.beginningBalance;
      let totalIncome = 0;
      let totalExpenses = 0;
      let lastTransactionDate: Date | null = null;

      // If we don't have a beginning balance set and we have transactions,
      // we need to set a reasonable beginning balance
      if (accountBalance.beginningBalance === 0 && transactions.length > 0) {
        // For the first calculation, we'll assume beginning balance
        // needs to be set based on current Plaid balance if available
        if (options.reconcileWithPlaid) {
          try {
            const plaidBalance = await this.getPlaidAccountBalance(
              userId,
              accountId
            );
            if (plaidBalance !== null) {
              // Calculate what beginning balance should be to match Plaid
              const transactionSum = transactions.reduce((sum, txn) => {
                return sum + (txn.type === "Income" ? txn.amount : -txn.amount);
              }, 0);
              accountBalance.beginningBalance = plaidBalance - transactionSum;
              runningBalance = accountBalance.beginningBalance;
            }
          } catch (error) {
            console.warn(
              `[BalanceCalculationService] Could not get Plaid balance for reconciliation: ${error.message}`
            );
          }
        }
      }

      // Process each transaction to calculate running balance
      for (const transaction of transactions) {
        if (transaction.type === "Income") {
          runningBalance += transaction.amount;
          totalIncome += transaction.amount;
        } else {
          runningBalance -= transaction.amount;
          totalExpenses += transaction.amount;
        }
        lastTransactionDate = transaction.date;
      }

      // Update account balance record
      accountBalance.currentBalance = runningBalance;
      accountBalance.lastTransactionDate = lastTransactionDate;
      accountBalance.calculationMetadata = {
        totalTransactions: transactions.length,
        totalIncome,
        totalExpenses,
        lastCalculationDate: new Date(),
        calculationMethod: "transaction_flow",
      };

      // Add snapshot if requested or if it's been more than a day since last snapshot
      const lastSnapshot =
        accountBalance.historicalSnapshots[
          accountBalance.historicalSnapshots.length - 1
        ];
      const shouldAddSnapshot =
        options.includeHistoricalSnapshots ||
        !lastSnapshot ||
        new Date().getTime() - lastSnapshot.date.getTime() >
          24 * 60 * 60 * 1000; // 24 hours

      if (shouldAddSnapshot) {
        accountBalance.addSnapshot(runningBalance, transactions.length, "sync");
      }

      // Reconcile with Plaid if requested
      let reconciliation;
      if (options.reconcileWithPlaid) {
        reconciliation = await this.reconcileWithPlaid(
          userId,
          accountId,
          runningBalance
        );
        accountBalance.reconciliation = reconciliation;
      }

      await accountBalance.save();

      const result: BalanceCalculationResult = {
        accountId,
        currentBalance: runningBalance,
        beginningBalance: accountBalance.beginningBalance,
        periodIncome: totalIncome,
        periodExpenses: totalExpenses,
        transactionCount: transactions.length,
        lastTransactionDate,
        calculationDate: new Date(),
        reconciliation,
      };

      if (options.includeHistoricalSnapshots) {
        result.historicalSnapshots = accountBalance.historicalSnapshots;
      }

      console.log(
        `[BalanceCalculationService] Balance calculation complete for account ${accountId}: $${runningBalance}`
      );

      return result;
    } catch (error) {
      console.error(
        `[BalanceCalculationService] Error calculating balance for account ${accountId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Calculate balances for all accounts belonging to a user
   */
  static async calculateAllUserBalances(
    userId: string,
    options: BalanceCalculationOptions = {}
  ): Promise<BalanceCalculationResult[]> {
    try {
      console.log(
        `[BalanceCalculationService] Calculating balances for all accounts for user ${userId}`
      );

      // Get all Plaid items for the user
      const plaidItems = await PlaidItem.find({ userId });
      const results: BalanceCalculationResult[] = [];

      for (const plaidItem of plaidItems) {
        for (const account of plaidItem.accounts) {
          try {
            const result = await this.calculateAccountBalance(
              userId,
              account.accountId,
              options
            );
            results.push(result);
          } catch (error) {
            console.error(
              `[BalanceCalculationService] Error calculating balance for account ${account.accountId}:`,
              error
            );
            // Continue with other accounts even if one fails
          }
        }
      }

      console.log(
        `[BalanceCalculationService] Calculated balances for ${results.length} accounts`
      );
      return results;
    } catch (error) {
      console.error(
        `[BalanceCalculationService] Error calculating user balances:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get balance for a specific date range with daily snapshots
   */
  static async getBalanceForDateRange(
    userId: string,
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DateRangeBalanceResult> {
    try {
      console.log(
        `[BalanceCalculationService] Getting balance for date range ${startDate.toISOString()} to ${endDate.toISOString()}`
      );

      // Get account balance record
      const accountBalance = await BankAccountBalance.findOne({
        userId,
        accountId,
      });
      if (!accountBalance) {
        throw new Error(`No balance record found for account ${accountId}`);
      }

      // Calculate balance at start date
      const startDateBalance = await this.calculateAccountBalance(
        userId,
        accountId,
        {
          endDate: startDate,
          forceRecalculation: true,
        }
      );

      // Calculate balance at end date
      const endDateBalance = await this.calculateAccountBalance(
        userId,
        accountId,
        {
          endDate: endDate,
          forceRecalculation: true,
        }
      );

      // Get transactions in the date range
      const periodTransactions = await Transaction.find({
        createdBy: userId,
        bankAccount: accountId,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 });

      const periodIncome = periodTransactions
        .filter((txn) => txn.type === "Income")
        .reduce((sum, txn) => sum + txn.amount, 0);

      const periodExpenses = periodTransactions
        .filter((txn) => txn.type === "Expense")
        .reduce((sum, txn) => sum + txn.amount, 0);

      // Generate daily snapshots
      const dailySnapshots = await this.generateDailySnapshots(
        userId,
        accountId,
        startDate,
        endDate,
        startDateBalance.currentBalance
      );

      const result: DateRangeBalanceResult = {
        accountId,
        startDate,
        endDate,
        startingBalance: startDateBalance.currentBalance,
        endingBalance: endDateBalance.currentBalance,
        periodIncome,
        periodExpenses,
        netChange:
          endDateBalance.currentBalance - startDateBalance.currentBalance,
        transactionCount: periodTransactions.length,
        dailySnapshots,
      };

      return result;
    } catch (error) {
      console.error(
        `[BalanceCalculationService] Error getting balance for date range:`,
        error
      );
      throw error;
    }
  }

  /**
   * Set beginning balance for an account
   */
  static async setBeginningBalance(
    userId: string,
    accountId: string,
    beginningBalance: number,
    effectiveDate: Date = new Date()
  ): Promise<void> {
    try {
      console.log(
        `[BalanceCalculationService] Setting beginning balance for account ${accountId}: $${beginningBalance}`
      );

      let accountBalance = await BankAccountBalance.findOne({
        userId,
        accountId,
      });

      if (!accountBalance) {
        throw new Error(
          `No balance record found for account ${accountId}. Please sync transactions first.`
        );
      }

      accountBalance.beginningBalance = beginningBalance;
      accountBalance.beginningBalanceDate = effectiveDate;

      // Add snapshot for this beginning balance
      accountBalance.addSnapshot(beginningBalance, 0, "manual");

      await accountBalance.save();

      // Recalculate current balance based on new beginning balance
      await this.calculateAccountBalance(userId, accountId, {
        forceRecalculation: true,
      });

      console.log(
        `[BalanceCalculationService] Beginning balance set successfully for account ${accountId}`
      );
    } catch (error) {
      console.error(
        `[BalanceCalculationService] Error setting beginning balance:`,
        error
      );
      throw error;
    }
  }

  /**
   * Reconcile calculated balance with Plaid's balance
   */
  private static async reconcileWithPlaid(
    userId: string,
    accountId: string,
    calculatedBalance: number
  ): Promise<any> {
    try {
      const plaidBalance = await this.getPlaidAccountBalance(userId, accountId);

      if (plaidBalance === null) {
        return {
          status: "needs_attention",
          error: "Could not retrieve Plaid balance",
        };
      }

      const difference = Math.abs(calculatedBalance - plaidBalance);
      const tolerance = 0.01; // $0.01 tolerance for rounding differences

      let status: "reconciled" | "needs_attention" | "critical";
      if (difference <= tolerance) {
        status = "reconciled";
      } else if (difference <= 10.0) {
        status = "needs_attention";
      } else {
        status = "critical";
      }

      return {
        plaidBalance,
        difference: calculatedBalance - plaidBalance,
        status,
        lastReconciliationDate: new Date(),
      };
    } catch (error) {
      console.error(
        `[BalanceCalculationService] Error during Plaid reconciliation:`,
        error
      );
      return {
        status: "needs_attention",
        error: error.message,
      };
    }
  }

  /**
   * Get current balance from Plaid
   */
  private static async getPlaidAccountBalance(
    userId: string,
    accountId: string
  ): Promise<number | null> {
    try {
      const plaidItem = await PlaidItem.findOne({
        userId,
        "accounts.accountId": accountId,
      });

      if (!plaidItem) {
        throw new Error("Plaid item not found");
      }

      const balanceResponse = await plaidClient.accountsBalanceGet({
        access_token: plaidItem.accessToken,
        options: {
          account_ids: [accountId],
        },
      });

      const account = balanceResponse.data.accounts.find(
        (acc) => acc.account_id === accountId
      );
      return account?.balances.current || null;
    } catch (error) {
      console.error(
        `[BalanceCalculationService] Error getting Plaid balance:`,
        error
      );
      return null;
    }
  }

  /**
   * Generate daily balance snapshots for a date range
   */
  private static async generateDailySnapshots(
    userId: string,
    accountId: string,
    startDate: Date,
    endDate: Date,
    startingBalance: number
  ): Promise<Array<{ date: Date; balance: number; transactions: number }>> {
    const snapshots = [];
    const currentDate = new Date(startDate);
    let runningBalance = startingBalance;

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Get transactions for this day
      const dayTransactions = await Transaction.find({
        createdBy: userId,
        bankAccount: accountId,
        date: { $gte: dayStart, $lte: dayEnd },
      }).sort({ date: 1 });

      // Calculate balance for this day
      for (const transaction of dayTransactions) {
        if (transaction.type === "Income") {
          runningBalance += transaction.amount;
        } else {
          runningBalance -= transaction.amount;
        }
      }

      snapshots.push({
        date: new Date(currentDate),
        balance: runningBalance,
        transactions: dayTransactions.length,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return snapshots;
  }

  /**
   * Update balances after transaction sync (called from PlaidService)
   */
  static async updateBalancesAfterSync(
    userId: string,
    plaidItemId: string
  ): Promise<void> {
    try {
      console.log(
        `[BalanceCalculationService] Updating balances after Plaid sync for user ${userId}`
      );

      const plaidItem = await PlaidItem.findById(plaidItemId);
      if (!plaidItem) {
        throw new Error("Plaid item not found");
      }

      // Update balances for all accounts in this Plaid item
      for (const account of plaidItem.accounts) {
        try {
          await this.calculateAccountBalance(userId, account.accountId, {
            forceRecalculation: true,
            includeHistoricalSnapshots: true,
            reconcileWithPlaid: true,
          });
        } catch (error) {
          console.error(
            `[BalanceCalculationService] Error updating balance for account ${account.accountId}:`,
            error
          );
        }
      }

      console.log(
        `[BalanceCalculationService] Balance update complete after sync`
      );
    } catch (error) {
      console.error(
        `[BalanceCalculationService] Error updating balances after sync:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all account balances for user (used by frontend)
   */
  static async getUserAccountBalances(userId: string): Promise<any[]> {
    try {
      const accountBalances = await BankAccountBalance.find({
        userId,
        isActive: true,
      }).sort({ institutionName: 1, accountName: 1 });

      return accountBalances.map((account) => ({
        _id: account._id,
        userId: account.userId,
        accountId: account.accountId,
        institutionName: account.institutionName,
        accountName: account.accountName,
        accountType: account.accountType,
        mask: account.mask,
        balance: account.currentBalance,
        currency: account.currency,
        lastSync: account.calculationMetadata.lastCalculationDate,
        reconciliationStatus: account.reconciliation.status,
        discrepancyCount: account.reconciliation.discrepancyCount,
        isActive: account.isActive,
        logoUrl: null, // Can be added later
      }));
    } catch (error) {
      console.error(
        `[BalanceCalculationService] Error getting user account balances:`,
        error
      );
      throw error;
    }
  }
}
