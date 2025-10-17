import { Transaction } from '../models/Transaction';
import { TaxRate } from '../models/TaxRate';
import mongoose from 'mongoose';

// Move calculateTax outside the controller as a standalone function
async function calculateTax(
  income: number,
  userId: string,
): Promise<{ taxAmount: number; effectiveRate: number }> {
  try {
    const taxConfig = await TaxRate.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isDefault: true,
    });

    if (!taxConfig) return { taxAmount: 0, effectiveRate: 0 };
    if (income <= 0) return { taxAmount: 0, effectiveRate: 0 };

    if (taxConfig.type === 'Flat') {
      const rate = taxConfig.flatRate || 0;
      const taxAmount = income * (rate / 100);
      return { taxAmount, effectiveRate: rate };
    } else {
      let remainingIncome = income;
      let totalTax = 0;

      if (!taxConfig.brackets || taxConfig.brackets.length === 0) {
        return { taxAmount: 0, effectiveRate: 0 };
      }

      for (const bracket of taxConfig.brackets) {
        if (remainingIncome <= 0) break;
        const bracketSize = bracket.maxIncome
          ? Math.min(bracket.maxIncome - bracket.minIncome, remainingIncome)
          : remainingIncome;
        const rate = bracket.rate || 0;
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
    return { taxAmount: 0, effectiveRate: 0 };
  }
}

// Profit & Loss
async function generateProfitAndLoss(
  userId: string,
  startDate: Date,
  endDate: Date,
  projectIds?: string[],
) {
  const profitLoss = {
    reportName: 'Profit & Loss Statement',
    period: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    year: startDate.getFullYear(),
    revenue: { byCategory: {} as Record<string, number>, totalRevenue: 0 },
    expenses: { byCategory: {} as Record<string, number>, totalExpenses: 0 },
    summary: {
      totalRevenue: 0,
      totalExpenses: 0,
      incomeBeforeTax: 0,
      incomeTaxExpense: 0,
      effectiveTaxRate: 0,
      netProfit: 0,
    },
  };

  const categories = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate },
      },
    },
    { $group: { _id: { type: '$type', category: '$category' } } },
  ]);

  categories.forEach((cat) => {
    const key = cat._id.category || 'Uncategorized';
    if (cat._id.type === 'Income') {
      profitLoss.revenue.byCategory[key] = 0;
    } else if (cat._id.type === 'Expense') {
      profitLoss.expenses.byCategory[key] = 0;
    }
  });


  const transactions = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate },
        ...(Array.isArray(projectIds) && projectIds.length ? { project: { $in: projectIds.map((id: string) => new mongoose.Types.ObjectId(id)) } } : {}),

      },
    },
    {
      $group: {
        _id: { type: '$type', category: '$category' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  transactions.forEach((t) => {
    const cat = t._id.category || 'Uncategorized';
    if (t._id.type === 'Income') {
      profitLoss.revenue.byCategory[cat] = t.total;
      profitLoss.revenue.totalRevenue += t.total;
      profitLoss.summary.totalRevenue += t.total;
    } else if (t._id.type === 'Expense') {
      profitLoss.expenses.byCategory[cat] = t.total;
      profitLoss.expenses.totalExpenses += t.total;
      profitLoss.summary.totalExpenses += t.total;
    }
  });

  profitLoss.summary.incomeBeforeTax =
    profitLoss.summary.totalRevenue - profitLoss.summary.totalExpenses;

  const { taxAmount, effectiveRate } = await calculateTax(
    profitLoss.summary.incomeBeforeTax,
    userId,
  );

  profitLoss.summary.incomeTaxExpense = taxAmount;
  profitLoss.summary.effectiveTaxRate = effectiveRate;
  profitLoss.summary.netProfit =
    profitLoss.summary.incomeBeforeTax - taxAmount;

  return profitLoss;
}

async function generateProjectProfitability(
  userId: string,
  startDate: Date,
  endDate: Date,
  projectIds?: string[],
) {
  const profitLoss = {
    reportName: 'Project Profitability Report',
    period: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    year: startDate.getFullYear(),
    revenue: { byCategory: {} as Record<string, number>, totalRevenue: 0 },
    expenses: { byCategory: {} as Record<string, number>, totalExpenses: 0 },
    summary: {
      totalRevenue: 0,
      totalExpenses: 0,
      incomeBeforeTax: 0,
      incomeTaxExpense: 0,
      effectiveTaxRate: 0,
      netProfit: 0,
    },
  };

  const ids = Array.isArray(projectIds) && projectIds.length
    ? projectIds.map((id: string) => new mongoose.Types.ObjectId(id))
    : [];

  const projectMatch = {
    $and: [
      { project: { $exists: true } },
      { project: { $ne: null } },
      ...(ids.length ? [{ project: { $in: ids } }] : []),
    ],
  };

  const categories = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate },
        ...projectMatch,
      },
    },
    { $group: { _id: { type: '$type', category: '$category' } } },
  ]);

  categories.forEach((cat) => {
    const key = cat._id.category || 'Uncategorized';
    if (cat._id.type === 'Income') {
      profitLoss.revenue.byCategory[key] = 0;
    } else if (cat._id.type === 'Expense') {
      profitLoss.expenses.byCategory[key] = 0;
    }
  });

  const transactions = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate },
        ...projectMatch,
      },
    },
    {
      $group: {
        _id: { type: '$type', category: '$category' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  transactions.forEach((t) => {
    const cat = t._id.category || 'Uncategorized';
    if (t._id.type === 'Income') {
      profitLoss.revenue.byCategory[cat] = t.total;
      profitLoss.revenue.totalRevenue += t.total;
      profitLoss.summary.totalRevenue += t.total;
    } else if (t._id.type === 'Expense') {
      profitLoss.expenses.byCategory[cat] = t.total;
      profitLoss.expenses.totalExpenses += t.total;
      profitLoss.summary.totalExpenses += t.total;
    }
  });

  profitLoss.summary.incomeBeforeTax =
    profitLoss.summary.totalRevenue - profitLoss.summary.totalExpenses;

  const { taxAmount, effectiveRate } = await calculateTax(
    profitLoss.summary.incomeBeforeTax,
    userId,
  );

  profitLoss.summary.incomeTaxExpense = taxAmount;
  profitLoss.summary.effectiveTaxRate = effectiveRate;
  profitLoss.summary.netProfit =
    profitLoss.summary.incomeBeforeTax - taxAmount;

  return profitLoss;
}

// Cash Flow
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
      adjustments: { depreciation: 0, amortization: 0, other: 0 },
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
    summary: { netCashFlow: 0, beginningCash: 0, endingCash: 0 },
  };

  const transactions = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: { type: '$type', category: '$category' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  let totalRevenue = 0;
  let totalExpenses = 0;

  transactions.forEach((t) => {
    if (t._id.type === 'Income') totalRevenue += t.total;
    else if (t._id.type === 'Expense') totalExpenses += t.total;
  });

  const incomeBeforeTax = totalRevenue - totalExpenses;
  const { taxAmount } = await calculateTax(incomeBeforeTax, userId);
  cashFlow.operatingActivities.netIncome = incomeBeforeTax - taxAmount;

  transactions.forEach((t) => {
    const category = t._id.category?.toLowerCase() || '';
    const amount = t.total;

    if (t._id.type === 'Income') {
      cashFlow.operatingActivities.totalOperatingCashFlow += amount;
    } else if (t._id.type === 'Expense') {
      if (
        category.includes('equipment') ||
        category.includes('asset') ||
        category.includes('capital')
      ) {
        cashFlow.investingActivities.equipmentPurchases += amount;
        cashFlow.investingActivities.totalInvestingCashFlow -= amount;
      } else if (
        category.includes('loan') ||
        category.includes('debt') ||
        category.includes('financing')
      ) {
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
        cashFlow.financingActivities.ownerWithdrawals += amount;
        cashFlow.financingActivities.totalFinancingCashFlow -= amount;
      } else {
        cashFlow.operatingActivities.totalOperatingCashFlow -= amount;
      }
    }
  });

  cashFlow.summary.netCashFlow =
    cashFlow.operatingActivities.totalOperatingCashFlow +
    cashFlow.investingActivities.totalInvestingCashFlow +
    cashFlow.financingActivities.totalFinancingCashFlow;

  cashFlow.summary.beginningCash = 0;
  cashFlow.summary.endingCash =
    cashFlow.summary.beginningCash + cashFlow.summary.netCashFlow;

  return cashFlow;
}

// Balance Sheet
async function generateBalanceSheet(
  userId: string,
  startDate: Date,
  endDate: Date,
  projectIds?: string[]
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
    equity: { ownerEquity: 0, retainedEarnings: 0, totalEquity: 0 },
  };

  const transactions = await Transaction.aggregate([
    {
      $match: {
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $lt: endDate },
      },
    },
    {
      $group: {
        _id: { type: '$type', category: '$category' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  let totalRevenue = 0;
  let totalExpenses = 0;
  let cashBalance = 0;

  transactions.forEach((t) => {
    const category = t._id.category?.toLowerCase() || '';
    const amount = t.total;

    if (t._id.type === 'Income') {
      totalRevenue += amount;
      cashBalance += amount;
    } else if (t._id.type === 'Expense') {
      totalExpenses += amount;
      cashBalance -= amount;

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

  const incomeBeforeTax = totalRevenue - totalExpenses;
  const { taxAmount } = await calculateTax(incomeBeforeTax, userId);
  const netIncome = incomeBeforeTax - taxAmount;

  balanceSheet.assets.currentAssets.cash = Math.max(0, cashBalance);

  balanceSheet.assets.currentAssets.totalCurrentAssets =
    balanceSheet.assets.currentAssets.cash +
    balanceSheet.assets.currentAssets.accountsReceivable +
    balanceSheet.assets.currentAssets.inventory +
    balanceSheet.assets.currentAssets.prepaidExpenses;

  balanceSheet.assets.fixedAssets.netFixedAssets =
    balanceSheet.assets.fixedAssets.equipment -
    balanceSheet.assets.fixedAssets.accumulatedDepreciation;
  balanceSheet.assets.fixedAssets.totalFixedAssets =
    balanceSheet.assets.fixedAssets.netFixedAssets;

  balanceSheet.assets.totalAssets =
    balanceSheet.assets.currentAssets.totalCurrentAssets +
    balanceSheet.assets.fixedAssets.totalFixedAssets;

  balanceSheet.liabilities.currentLiabilities.totalCurrentLiabilities =
    balanceSheet.liabilities.currentLiabilities.accountsPayable +
    balanceSheet.liabilities.currentLiabilities.shortTermDebt +
    balanceSheet.liabilities.currentLiabilities.accruedExpenses;

  balanceSheet.liabilities.longTermLiabilities.totalLongTermLiabilities =
    balanceSheet.liabilities.longTermLiabilities.longTermDebt;

  balanceSheet.liabilities.totalLiabilities =
    balanceSheet.liabilities.currentLiabilities.totalCurrentLiabilities +
    balanceSheet.liabilities.longTermLiabilities.totalLongTermLiabilities;

  balanceSheet.equity.retainedEarnings = netIncome;
  balanceSheet.equity.totalEquity =
    balanceSheet.equity.ownerEquity + balanceSheet.equity.retainedEarnings;

  const diff =
    balanceSheet.assets.totalAssets -
    (balanceSheet.liabilities.totalLiabilities +
      balanceSheet.equity.totalEquity);

  balanceSheet.equity.ownerEquity += diff;
  balanceSheet.equity.totalEquity =
    balanceSheet.equity.ownerEquity + balanceSheet.equity.retainedEarnings;

  return balanceSheet;
}

// Export controller
export const reportsController = {
  generateProfitAndLoss,
  generateCashFlow,
  generateBalanceSheet,
  generateProjectProfitability,

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
    } catch (e: any) {
      console.error('Error generating P&L report:', e);
      res.status(500).json({ error: e.message });
    }
  },

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
    } catch (e: any) {
      console.error('Error generating Cash Flow report:', e);
      res.status(500).json({ error: e.message });
    }
  },

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
            end = new Date(year, 11, 31);
        }
      } else if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
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
    } catch (e: any) {
      console.error('Error generating Balance Sheet report:', e);
      res.status(500).json({ error: e.message });
    }
  },

  async getTransactionsCsv(req: any, res: any) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { startDate, endDate } = req.params;
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: 'startDate and endDate params are required (YYYY-MM-DD)' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res
          .status(400)
          .json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      end.setHours(23, 59, 59, 999);

      const transactions = await Transaction.find({
        createdBy: new mongoose.Types.ObjectId(userId),
        date: { $gte: start, $lte: end },
      })
        .sort({ date: 1 })
        .lean();

      const headers = [
        'Name',
        'Date',
        'Category',
        'Amount',
        'Account',
      ];

      // Helper to safely derive a human-readable account name
      const resolveAccountName = (t: any): string => {
        if (typeof t.accountName === 'string' && t.accountName.trim()) return t.accountName.trim();
        if (t.meta?.accountName) return String(t.meta.accountName);

        // t.account might be:
        // 1. a plain string (possibly JSON)
        // 2. an object containing Plaid account data
        if (t.account) {
          if (typeof t.account === 'string') {
            // Try to parse JSON string
            try {
              const parsed = JSON.parse(t.account);
              if (parsed && typeof parsed === 'object') {
                return (
                  parsed.name ||
                  parsed.official_name ||
                  parsed.mask ||
                  parsed.account_id ||
                  t.account
                );
              }
            } catch {
              // Not JSON, just return as-is
              return t.account;
            }
            return t.account;
          }
          if (typeof t.account === 'object') {
            return (
              t.account.name ||
              t.account.official_name ||
              t.account.mask ||
              t.account.account_id ||
              ''
            );
          }
        }

        if (t.accountId) return String(t.accountId);
        return '';
      };

      const rows = transactions.map((t: any) => {
        const name = t.name || t.description || '';
        const date = t.date
          ? new Date(t.date).toISOString().split('T')[0]
          : '';
        const category = t.category || 'Uncategorized';
        const amount =
          typeof t.amount === 'number' ? t.amount.toFixed(2) : '';
        const account = resolveAccountName(t);

        return [name, date, category, amount, account];
      });

      const escape = (val: string) => {
        if (val == null) return '';
        const needsQuotes = /[",\n]/.test(val);
        const escaped = String(val).replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      };

      const csv = [
        headers.map(escape).join(','),
        ...rows.map((r) => r.map(escape).join(',')),
      ].join('\n');

      if (req.query.format === 'json') {
        return res.json({
          report: {
            type: 'transactions_csv',
            headers,
            rows,
            count: rows.length,
            totalAmount: transactions.reduce(
              (sum: number, t: any) =>
                typeof t.amount === 'number' ? sum + t.amount : sum,
              0,
            ),
          },
          metadata: {
            generatedAt: new Date(),
            startDate: start,
            endDate: end,
            duration: 'custom',
          },
        });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=transactions_${startDate}_${endDate}.csv`,
      );
      res.send(csv);
    } catch (e: any) {
      console.error('Error generating transactions CSV report:', e);
      res
        .status(500)
        .json({ error: 'Failed to generate transactions CSV report' });
    }
  },
};