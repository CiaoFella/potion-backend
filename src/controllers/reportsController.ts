import { Transaction } from "../models/Transaction";
import { TaxRate } from "../models/TaxRate";
import mongoose from "mongoose";

// Move calculateTax outside the controller as a standalone function
async function calculateTax(income: number, userId: string): Promise<{ taxAmount: number, effectiveRate: number }> {
    try {
        // Get user's default tax configuration
        const taxConfig = await TaxRate.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            isDefault: true
        });

        // If no tax configuration found, use 0% tax rate
        if (!taxConfig) {
            return { taxAmount: 0, effectiveRate: 0 };
        }

        // For negative income, no tax applies
        if (income <= 0) {
            return { taxAmount: 0, effectiveRate: 0 };
        }

        if (taxConfig.type === "Flat") {
            // Simple flat rate calculation
            const rate = taxConfig.flatRate || 0; // Default to 0 if not set
            const taxAmount = income * (rate / 100);
            return {
                taxAmount,
                effectiveRate: rate
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

                const bracketSize = bracket.maxIncome ?
                    Math.min(bracket.maxIncome - bracket.minIncome, remainingIncome) :
                    remainingIncome;

                const rate = bracket.rate || 0; // Default to 0 if rate not set
                totalTax += bracketSize * (rate / 100);
                remainingIncome -= bracketSize;
            }

            return {
                taxAmount: totalTax,
                effectiveRate: income > 0 ? (totalTax / income) * 100 : 0
            };
        }
    } catch (error) {
        console.error("Error calculating tax:", error);
        // On any error, default to 0% tax
        return { taxAmount: 0, effectiveRate: 0 };
    }
}

// Move generateProfitAndLoss outside as a standalone function
async function generateProfitAndLoss(userId: string, startDate: Date, endDate: Date) {
    const profitLoss = {
        reportName: "Profit & Loss Statement",
        period: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        year: startDate.getFullYear(),
        revenue: {
            byCategory: {},
            totalRevenue: 0
        },
        expenses: {
            byCategory: {},
            totalExpenses: 0
        },
        summary: {
            totalRevenue: 0,
            totalExpenses: 0,
            incomeBeforeTax: 0,
            incomeTaxExpense: 0,
            effectiveTaxRate: 0,
            netProfit: 0
        }
    };

    // Get all unique categories
    const categories = await Transaction.aggregate([
        {
            $match: {
                createdBy: new mongoose.Types.ObjectId(userId),
                date: { $gte: startDate, $lt: endDate }
            }
        },
        {
            $group: {
                _id: {
                    type: "$type",
                    category: "$category"
                }
            }
        }
    ]);

    // Initialize category totals
    categories.forEach(cat => {
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
                date: { $gte: startDate, $lt: endDate }
            }
        },
        {
            $group: {
                _id: {
                    type: "$type",
                    category: "$category"
                },
                total: { $sum: "$amount" }
            }
        }
    ]);

    // Process transactions
    transactions.forEach(transaction => {
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
    profitLoss.summary.incomeBeforeTax = profitLoss.summary.totalRevenue - profitLoss.summary.totalExpenses;

    // Calculate tax
    const { taxAmount, effectiveRate } = await calculateTax(
        profitLoss.summary.incomeBeforeTax,
        userId
    );

    profitLoss.summary.incomeTaxExpense = taxAmount;
    profitLoss.summary.effectiveTaxRate = effectiveRate;
    profitLoss.summary.netProfit = profitLoss.summary.incomeBeforeTax - taxAmount;

    return profitLoss;
}

// Export the controller with standalone functions
export const reportsController = {
    generateProfitAndLoss, // Export the standalone function

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
                    duration: duration || 'custom'
                }
            });
        } catch (e) {
            console.error("Error generating P&L report:", e);
            res.status(500).json({ error: e.message });
        }
    },

    // Placeholder for future report types
    async getBalanceSheet(req: any, res: any) {
        res.status(501).json({ message: "Balance Sheet report coming soon" });
    },

    async getCashFlow(req: any, res: any) {
        res.status(501).json({ message: "Cash Flow report coming soon" });
    }
}; 