import { Transaction } from '../models/Transaction';
import { TaxRate } from '../models/TaxRate';
import mongoose from 'mongoose';

// Move calculateTax outside the controller as a standalone function
async function calculateTax(
  income: number,
  userId: string,
): Promise<{ taxAmount: number; effectiveRate: number }> {
  try {
    // Get user's default tax configuration
    const taxConfig = await TaxRate.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isDefault: true,
    });

    // If no tax configuration found, use 0% tax rate
    if (!taxConfig) {
      return { taxAmount: 0, effectiveRate: 0 };
    }

    // For negative income, no tax applies
    if (income <= 0) {
      return { taxAmount: 0, effectiveRate: 0 };
    }

    if (taxConfig.type === 'Flat') {
      // Simple flat rate calculation
      const rate = taxConfig.flatRate || 0; // Default to 0 if not set
      const taxAmount = income * (rate / 100);
      return {
        taxAmount,
        effectiveRate: rate,
      };
    } else {
      // Progressive tax calculation
      let remainingIncome = income;
      let totalTax = 0;

      // If no brackets defined, use 0% tax
      if (!taxConfig.brackets || taxConfig.brackets.length === 0) {
        return { taxAmount: 0, effectiveRate: 0 };
      }

      for (const bracket of taxConfig.brackets) {
        if (remainingIncome <= 0) break;

        const bracketSize = bracket.maxIncome
          ? Math.min(bracket.maxIncome - bracket.minIncome, remainingIncome)
          : remainingIncome;

        const rate = bracket.rate || 0; // Default to 0 if rate not set
        totalTax += bracketSize * (rate / 100);
        remainingIncome -= bracketSize;
      }

      return {
        taxAmount: totalTax,
        effectiveRate: income > 0 ? (totalTax / income) * 100 : 0,
      };
    }
  } catch (error) {
    console.error('Error calculating tax:', error);
    // On any error, default to 0% tax
    return { taxAmount: 0, effectiveRate: 0 };
  }
}

// Move generateProfitAndLoss outside as a standalone function
async function generateProfitAndLoss(
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  const profitLoss = {
    reportName: 'Profit & Loss Statement',
    period: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    year: startDate.getFullYear(),
    revenue: {
      byCategory: {},
      totalRevenue: 0,
    },
    expenses: {
      byCategory: {},
      totalExpenses: 0,
    },
    summary: {
      totalRevenue: 0,
      totalExpenses: 0,
      incomeBeforeTax: 0,
      incomeTaxExpense: 0,
      effectiveTaxRate: 0,
      netProfit: 0,
    },
  };

  // Get all unique categories
  const categories = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          type: '$type',
          category: '$category',
        },
      },
    },
  ]);

  // Initialize category totals
  categories.forEach((cat) => {
    if (cat._id.type === 'Income') {
      profitLoss.revenue.byCategory[cat._id.category || 'Uncategorized'] = 0;
    } else if (cat._id.type === 'Expense') {
      profitLoss.expenses.byCategory[cat._id.category || 'Uncategorized'] = 0;
    }
  });

  // Get transactions with amounts
  const transactions = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          type: '$type',
          category: '$category',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Process transactions
  transactions.forEach((transaction) => {
    const category = transaction._id.category || 'Uncategorized';

    if (transaction._id.type === 'Income') {
      profitLoss.revenue.byCategory[category] = transaction.total;
      profitLoss.revenue.totalRevenue += transaction.total;
      profitLoss.summary.totalRevenue += transaction.total;
    } else if (transaction._id.type === 'Expense') {
      profitLoss.expenses.byCategory[category] = transaction.total;
      profitLoss.expenses.totalExpenses += transaction.total;
      profitLoss.summary.totalExpenses += transaction.total;
    }
  });

  // Calculate income before tax
  profitLoss.summary.incomeBeforeTax =
    profitLoss.summary.totalRevenue - profitLoss.summary.totalExpenses;

  // Calculate tax
  const { taxAmount, effectiveRate } = await calculateTax(
    profitLoss.summary.incomeBeforeTax,
    userId,
  );

  profitLoss.summary.incomeTaxExpense = taxAmount;
  profitLoss.summary.effectiveTaxRate = effectiveRate;
  profitLoss.summary.netProfit = profitLoss.summary.incomeBeforeTax - taxAmount;

  return profitLoss;
}

// Generate Cash Flow Statement
async function generateCashFlow(
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  const cashFlow = {
    reportName: 'Cash Flow Statement',
    period: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    year: startDate.getFullYear(),
    operatingActivities: {
      netIncome: 0,
      adjustments: {
        depreciation: 0,
        amortization: 0,
        other: 0,
      },
      workingCapitalChanges: {
        accountsReceivable: 0,
        accountsPayable: 0,
        inventory: 0,
        other: 0,
      },
      totalOperatingCashFlow: 0,
    },
    investingActivities: {
      equipmentPurchases: 0,
      assetSales: 0,
      investments: 0,
      totalInvestingCashFlow: 0,
    },
    financingActivities: {
      loans: 0,
      loanRepayments: 0,
      ownerInvestments: 0,
      ownerWithdrawals: 0,
      totalFinancingCashFlow: 0,
    },
    summary: {
      netCashFlow: 0,
      beginningCash: 0,
      endingCash: 0,
    },
  };

  // Get all transactions for the period
  const transactions = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          type: '$type',
          category: '$category',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Calculate net income (simplified - using P&L logic)
  let totalRevenue = 0;
  let totalExpenses = 0;

  transactions.forEach((transaction) => {
    if (transaction._id.type === 'Income') {
      totalRevenue += transaction.total;
    } else if (transaction._id.type === 'Expense') {
      totalExpenses += transaction.total;
    }
  });

  // Calculate income before tax
  const incomeBeforeTax = totalRevenue - totalExpenses;

  // Calculate tax
  const { taxAmount } = await calculateTax(incomeBeforeTax, userId);

  cashFlow.operatingActivities.netIncome = incomeBeforeTax - taxAmount;

  // Categorize cash flows based on transaction categories
  transactions.forEach((transaction) => {
    const category = transaction._id.category?.toLowerCase() || '';
    const amount = transaction.total;

    // Operating activities (most revenue and operating expenses)
    if (transaction._id.type === 'Income') {
      // Income generally contributes to operating cash flow
      cashFlow.operatingActivities.totalOperatingCashFlow += amount;
    } else if (transaction._id.type === 'Expense') {
      // Categorize expenses into different cash flow types
      if (
        category.includes('equipment') ||
        category.includes('asset') ||
        category.includes('capital')
      ) {
        // Investing activities
        cashFlow.investingActivities.equipmentPurchases += amount;
        cashFlow.investingActivities.totalInvestingCashFlow -= amount;
      } else if (
        category.includes('loan') ||
        category.includes('debt') ||
        category.includes('financing')
      ) {
        // Financing activities
        if (category.includes('repayment') || category.includes('payment')) {
          cashFlow.financingActivities.loanRepayments += amount;
          cashFlow.financingActivities.totalFinancingCashFlow -= amount;
        } else {
          cashFlow.financingActivities.loans += amount;
          cashFlow.financingActivities.totalFinancingCashFlow += amount;
        }
      } else if (
        category.includes('owner') ||
        category.includes('dividend') ||
        category.includes('withdrawal')
      ) {
        // Owner withdrawals
        cashFlow.financingActivities.ownerWithdrawals += amount;
        cashFlow.financingActivities.totalFinancingCashFlow -= amount;
      } else {
        // Operating expenses
        cashFlow.operatingActivities.totalOperatingCashFlow -= amount;
      }
    }
  });

  // Calculate summary
  cashFlow.summary.netCashFlow =
    cashFlow.operatingActivities.totalOperatingCashFlow +
    cashFlow.investingActivities.totalInvestingCashFlow +
    cashFlow.financingActivities.totalFinancingCashFlow;

  // For beginning cash, we could look at previous period or use 0
  cashFlow.summary.beginningCash = 0; // This could be enhanced to look at previous period
  cashFlow.summary.endingCash =
    cashFlow.summary.beginningCash + cashFlow.summary.netCashFlow;

  return cashFlow;
}

// Generate Balance Sheet
async function generateBalanceSheet(
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  const balanceSheet = {
    reportName: 'Balance Sheet',
    period: `As of ${endDate.toLocaleDateString()}`,
    year: endDate.getFullYear(),
    assets: {
      currentAssets: {
        cash: 0,
        accountsReceivable: 0,
        inventory: 0,
        prepaidExpenses: 0,
        totalCurrentAssets: 0,
      },
      fixedAssets: {
        equipment: 0,
        accumulatedDepreciation: 0,
        netFixedAssets: 0,
        totalFixedAssets: 0,
      },
      totalAssets: 0,
    },
    liabilities: {
      currentLiabilities: {
        accountsPayable: 0,
        shortTermDebt: 0,
        accruedExpenses: 0,
        totalCurrentLiabilities: 0,
      },
      longTermLiabilities: {
        longTermDebt: 0,
        totalLongTermLiabilities: 0,
      },
      totalLiabilities: 0,
    },
    equity: {
      ownerEquity: 0,
      retainedEarnings: 0,
      totalEquity: 0,
    },
  };

  // Get all transactions up to the balance sheet date
  const transactions = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          type: '$type',
          category: '$category',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  // Calculate retained earnings (cumulative net income)
  let totalRevenue = 0;
  let totalExpenses = 0;
  let cashBalance = 0;

  transactions.forEach((transaction) => {
    const category = transaction._id.category?.toLowerCase() || '';
    const amount = transaction.total;

    if (transaction._id.type === 'Income') {
      totalRevenue += amount;
      cashBalance += amount;
    } else if (transaction._id.type === 'Expense') {
      totalExpenses += amount;
      cashBalance -= amount;

      // Categorize expenses into balance sheet items
      if (
        category.includes('equipment') ||
        category.includes('asset') ||
        category.includes('capital')
      ) {
        balanceSheet.assets.fixedAssets.equipment += amount;
      } else if (category.includes('debt') || category.includes('loan')) {
        if (category.includes('long') || category.includes('term')) {
          balanceSheet.liabilities.longTermLiabilities.longTermDebt += amount;
        } else {
          balanceSheet.liabilities.currentLiabilities.shortTermDebt += amount;
        }
      } else if (category.includes('payable') || category.includes('owed')) {
        balanceSheet.liabilities.currentLiabilities.accountsPayable += amount;
      }
    }
  });

  // Calculate net income and tax
  const incomeBeforeTax = totalRevenue - totalExpenses;
  const { taxAmount } = await calculateTax(incomeBeforeTax, userId);
  const netIncome = incomeBeforeTax - taxAmount;

  // Set cash (simplified - actual cash balance would need more sophisticated tracking)
  balanceSheet.assets.currentAssets.cash = Math.max(0, cashBalance);

  // Calculate totals for current assets
  balanceSheet.assets.currentAssets.totalCurrentAssets =
    balanceSheet.assets.currentAssets.cash +
    balanceSheet.assets.currentAssets.accountsReceivable +
    balanceSheet.assets.currentAssets.inventory +
    balanceSheet.assets.currentAssets.prepaidExpenses;

  // Calculate fixed assets (simplified depreciation)
  balanceSheet.assets.fixedAssets.netFixedAssets =
    balanceSheet.assets.fixedAssets.equipment -
    balanceSheet.assets.fixedAssets.accumulatedDepreciation;
  balanceSheet.assets.fixedAssets.totalFixedAssets =
    balanceSheet.assets.fixedAssets.netFixedAssets;

  // Total assets
  balanceSheet.assets.totalAssets =
    balanceSheet.assets.currentAssets.totalCurrentAssets +
    balanceSheet.assets.fixedAssets.totalFixedAssets;

  // Calculate liability totals
  balanceSheet.liabilities.currentLiabilities.totalCurrentLiabilities =
    balanceSheet.liabilities.currentLiabilities.accountsPayable +
    balanceSheet.liabilities.currentLiabilities.shortTermDebt +
    balanceSheet.liabilities.currentLiabilities.accruedExpenses;

  balanceSheet.liabilities.longTermLiabilities.totalLongTermLiabilities =
    balanceSheet.liabilities.longTermLiabilities.longTermDebt;

  balanceSheet.liabilities.totalLiabilities =
    balanceSheet.liabilities.currentLiabilities.totalCurrentLiabilities +
    balanceSheet.liabilities.longTermLiabilities.totalLongTermLiabilities;

  // Calculate equity
  balanceSheet.equity.retainedEarnings = netIncome;
  balanceSheet.equity.totalEquity =
    balanceSheet.equity.ownerEquity + balanceSheet.equity.retainedEarnings;

  // Balance sheet must balance: Assets = Liabilities + Equity
  // Adjust owner equity to balance if needed
  const balanceDifference =
    balanceSheet.assets.totalAssets -
    (balanceSheet.liabilities.totalLiabilities +
      balanceSheet.equity.totalEquity);

  balanceSheet.equity.ownerEquity += balanceDifference;
  balanceSheet.equity.totalEquity =
    balanceSheet.equity.ownerEquity + balanceSheet.equity.retainedEarnings;

  return balanceSheet;
}

// Export the controller with standalone functions
export const reportsController = {
  generateProfitAndLoss, // Export the standalone function
  generateCashFlow, // Export the standalone function
  generateBalanceSheet, // Export the standalone function

  // HTTP endpoint for P&L
  async getProfitAndLoss(req: any, res: any) {
    try {
      const userId = req.user?.userId;
      const { startDate, endDate, duration } = req.query;

      let start: Date;
      let end: Date = new Date();

      if (duration) {
        switch (duration.toLowerCase()) {
          case 'monthly':
            start = new Date();
            start.setMonth(start.getMonth() - 1);
            break;
          case 'quarterly':
            start = new Date();
            start.setMonth(start.getMonth() - 3);
            break;
          case 'yearly':
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
            break;
          case 'ytd':
            start = new Date(new Date().getFullYear(), 0, 1);
            break;
          default:
            const year = parseInt(req.query.year) || new Date().getFullYear();
            start = new Date(year, 0, 1);
            end = new Date(year + 1, 0, 1);
        }
      } else if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        start = new Date(year, 0, 1);
        end = new Date(year + 1, 0, 1);
      }

      const profitLoss = await generateProfitAndLoss(userId, start, end);

      res.json({
        report: profitLoss,
        metadata: {
          generatedAt: new Date(),
          startDate: start,
          endDate: end,
          duration: duration || 'custom',
        },
      });
    } catch (e) {
      console.error('Error generating P&L report:', e);
      res.status(500).json({ error: e.message });
    }
  },

  // HTTP endpoint for Cash Flow
  async getCashFlow(req: any, res: any) {
    try {
      const userId = req.user?.userId;
      const { startDate, endDate, duration } = req.query;

      let start: Date;
      let end: Date = new Date();

      if (duration) {
        switch (duration.toLowerCase()) {
          case 'monthly':
            start = new Date();
            start.setMonth(start.getMonth() - 1);
            break;
          case 'quarterly':
            start = new Date();
            start.setMonth(start.getMonth() - 3);
            break;
          case 'yearly':
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
            break;
          case 'ytd':
            start = new Date(new Date().getFullYear(), 0, 1);
            break;
          default:
            const year = parseInt(req.query.year) || new Date().getFullYear();
            start = new Date(year, 0, 1);
            end = new Date(year + 1, 0, 1);
        }
      } else if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        start = new Date(year, 0, 1);
        end = new Date(year + 1, 0, 1);
      }

      const cashFlow = await generateCashFlow(userId, start, end);

      res.json({
        report: cashFlow,
        metadata: {
          generatedAt: new Date(),
          startDate: start,
          endDate: end,
          duration: duration || 'custom',
        },
      });
    } catch (e) {
      console.error('Error generating Cash Flow report:', e);
      res.status(500).json({ error: e.message });
    }
  },

  // HTTP endpoint for Balance Sheet
  async getBalanceSheet(req: any, res: any) {
    try {
      const userId = req.user?.userId;
      const { startDate, endDate, duration } = req.query;

      let start: Date;
      let end: Date = new Date();

      if (duration) {
        switch (duration.toLowerCase()) {
          case 'monthly':
            end = new Date();
            start = new Date();
            start.setMonth(start.getMonth() - 1);
            break;
          case 'quarterly':
            end = new Date();
            start = new Date();
            start.setMonth(start.getMonth() - 3);
            break;
          case 'yearly':
            end = new Date();
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
            break;
          case 'ytd':
            end = new Date();
            start = new Date(new Date().getFullYear(), 0, 1);
            break;
          default:
            const year = parseInt(req.query.year) || new Date().getFullYear();
            start = new Date(year, 0, 1);
            end = new Date(year, 11, 31); // End of year for balance sheet
        }
      } else if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31); // End of year for balance sheet
      }

      const balanceSheet = await generateBalanceSheet(userId, start, end);

      res.json({
        report: balanceSheet,
        metadata: {
          generatedAt: new Date(),
          startDate: start,
          endDate: end,
          duration: duration || 'custom',
        },
      });
    } catch (e) {
      console.error('Error generating Balance Sheet report:', e);
      res.status(500).json({ error: e.message });
    }
  },
};
