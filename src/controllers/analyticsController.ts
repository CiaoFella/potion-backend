import { Transaction } from "../models/Transaction";
import mongoose from "mongoose";

function getMonthName(monthIndex: number) {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex];
}

export const analyticsController = {
    // 1. Profit and Loss Statement
    async profitLoss(req: any, res: any) {
        try {
            const userId = req.user?.userId;
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const start = new Date(year, 0, 1);
            const end = new Date(year + 1, 0, 1);

            const data = await Transaction.aggregate([
                { $match: { createdBy: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lt: end } } },
                {
                    $group: {
                        _id: { month: { $month: "$date" }, type: "$type" },
                        total: { $sum: "$amount" },
                    },
                },
            ]);

            // Format result
            const months = Array.from({ length: 12 }, (_, i) => ({ month: getMonthName(i), netAmount: 0 }));
            data.forEach((item) => {
                const idx = item._id.month - 1;
                if (item._id.type === "Income") {
                    months[idx].netAmount += item.total;
                } else if (item._id.type === "Expense") {
                    months[idx].netAmount -= item.total;
                }
            });
            res.json({ months });
        } catch (e) {
            console.log(e);
            res.status(500).json({ error: e.message });
        }
    },

    // 2. Total Spending
    async totalSpending(req: any, res: any) {
        try {
            const userId = req.user?.userId;
            const now = new Date();
            const start = req.query.startDate ? new Date(req.query.startDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = req.query.endDate ? new Date(req.query.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 1);

            console.log("totalSpending - userId:", userId);
            console.log("totalSpending - start Date:", start);
            console.log("totalSpending - end Date:", end);
            console.log("totalSpending - req.query:", req.query);

            const data = await Transaction.aggregate([
                { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Expense", date: { $gte: start, $lt: end } } },
                { $group: { _id: "$category", amount: { $sum: "$amount" } } },
            ]);
            console.log("totalSpending - data from DB:", JSON.stringify(data));

            const total = data.reduce((sum, c) => sum + c.amount, 0);
            const categories = data.map((c) => ({ name: c._id, amount: c.amount, percent: total ? Math.round((c.amount / total) * 100) : 0 }));
            res.json({ total, categories });
        } catch (e) {
            console.error("Error in totalSpending:", e);
            res.status(500).json({ error: e.message });
        }
    },

    // 3. Income vs Expense
    async incomeVsExpense(req: any, res: any) {
        try {
            console.log("incomeVsExpense");
            const userId = req.user?.userId;

            console.log(userId);

            let match: any = { createdBy: new mongoose.Types.ObjectId(userId) };
            if (req.query.startDate) {
                match.date = { ...match.date, $gte: new Date(req.query.startDate) };
            }
            if (req.query.endDate) {
                match.date = { ...match.date, $lt: new Date(req.query.endDate) };
            }

            const aggregatedResults = await Transaction.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: {
                            // Group by the date string and the type
                            dateString: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                            type: "$type"
                        },
                        // Sum amounts for each group
                        totalAmount: { $sum: "$amount" }
                    }
                },
                // Sorting here can be beneficial if the dataset is very large,
                // but JS sort is also fine for typical API response sizes.
                // { $sort: { "_id.dateString": 1 } }
            ]);

            // Process aggregated results to format into daily income/expense summaries
            const dailySummaryMap: Record<string, { date: string; income: number; expense: number }> = {};

            aggregatedResults.forEach(item => {
                const dateStr = item._id.dateString;

                // Initialize entry for the date if it doesn't exist
                if (!dailySummaryMap[dateStr]) {
                    dailySummaryMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
                }

                // Add to income or expense based on type
                if (item._id.type === "Income") {
                    dailySummaryMap[dateStr].income += item.totalAmount;
                } else if (item._id.type === "Expense") {
                    dailySummaryMap[dateStr].expense += item.totalAmount;
                }
            });

            // Convert map to array and sort by date
            // Dates are in "YYYY-MM-DD" format, so direct string comparison works for chronological sorting
            const dailyData = Object.values(dailySummaryMap).sort((a, b) => a.date.localeCompare(b.date));

            res.json({ data: dailyData });
        } catch (e) {
            console.log(e); // Keep basic error logging
            res.status(500).json({ error: e.message });
        }
    },

    // 4. Trend Analysis
    async trends(req: any, res: any) {
        try {
            const userId = req.user?.userId;
            const now = new Date();
            const thisMonthStart = req.query.startDate ? new Date(req.query.startDate) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthStart = req.query.startDate ? new Date(req.query.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthEnd = req.query.endDate ? new Date(req.query.endDate) : new Date(now.getFullYear(), now.getMonth(), 1);

            // Expenses by category: this month
            const thisMonth = await Transaction.aggregate([
                { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Expense", date: { $gte: thisMonthStart, $lt: now } } },
                { $group: { _id: "$category", amount: { $sum: "$amount" } } },
            ]);
            // Expenses by category: last month
            const prevMonth = await Transaction.aggregate([
                { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Expense", date: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
                { $group: { _id: "$category", amount: { $sum: "$amount" } } },
            ]);
            // Calculate growth
            const growthMap: Record<string, { name: string; growth: number }> = {};
            thisMonth.forEach((cat) => {
                const prev = prevMonth.find((c) => c._id === cat._id);
                const growth = prev ? ((cat.amount - prev.amount) / prev.amount) * 100 : 100;
                growthMap[cat._id] = { name: cat._id, growth: Math.round(growth) };
            });
            const topExpenses = Object.values(growthMap).sort((a, b) => b.growth - a.growth).slice(0, 5);

            // Revenue sources: this month
            const thisMonthRev = await Transaction.aggregate([
                { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Income", date: { $gte: thisMonthStart, $lt: now } } },
                { $group: { _id: "$recipient", amount: { $sum: "$amount" } } },
            ]);
            // Revenue sources: last month
            const prevMonthRev = await Transaction.aggregate([
                { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Income", date: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
                { $group: { _id: "$recipient", amount: { $sum: "$amount" } } },
            ]);
            // Calculate growth
            const revGrowthMap: Record<string, { name: string; growth: number }> = {};
            thisMonthRev.forEach((rec) => {
                const prev = prevMonthRev.find((c) => c._id === rec._id);
                const growth = prev ? ((rec.amount - prev.amount) / prev.amount) * 100 : 100;
                revGrowthMap[rec._id] = { name: rec._id, growth: Math.round(growth) };
            });
            const topRevenue = Object.values(revGrowthMap).sort((a, b) => b.growth - a.growth).slice(0, 5);

            res.json({ topExpenses, topRevenue });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    },

    // 5. AI Smart Insights
    async insights(req: any, res: any) {
        try {
            const userId = req.user?.userId;
            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

            // Profit this and last month
            const [thisMonth, lastMonth] = await Promise.all([
                Transaction.aggregate([
                    { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Income", date: { $gte: thisMonthStart, $lt: now } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ]),
                Transaction.aggregate([
                    { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Income", date: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ]),
            ]);
            const profitNow = thisMonth[0]?.total || 0;
            const profitPrev = lastMonth[0]?.total || 0;
            const profitDrop = profitPrev ? Math.round(((profitPrev - profitNow) / profitPrev) * 100) : 0;

            // Software expense trend (example: category = Software & Tools)
            const [softNow, softPrev] = await Promise.all([
                Transaction.aggregate([
                    { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Expense", category: "Software & Tools", date: { $gte: thisMonthStart, $lt: now } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ]),
                Transaction.aggregate([
                    { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Expense", category: "Software & Tools", date: { $gte: lastMonthStart, $lt: lastMonthEnd } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ]),
            ]);
            const softNowVal = softNow[0]?.total || 0;
            const softPrevVal = softPrev[0]?.total || 0;
            const softGrowth = softPrevVal ? Math.round(((softNowVal - softPrevVal) / softPrevVal) * 100) : 0;

            res.json({
                profitAlert: {
                    message: profitDrop > 0 ? `Monthly profit dropped from $${profitPrev.toLocaleString()} to $${profitNow.toLocaleString()} (${profitDrop}% decrease).` : "No significant profit drop.",
                },
                expenseTrend: {
                    message: softGrowth > 0 ? `Software expense reached $${softNowVal.toLocaleString()} this month, a ${softGrowth}% increase.` : "No significant software expense increase.",
                },
                cashFlowHealth: {
                    message: softGrowth > 0 ? `Software expenses reached $${softNowVal.toLocaleString()} this month, a ${softGrowth}% increase. Consider reviewing subscriptions and consolidating tools.` : "Cash flow is healthy.",
                },
            });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    },

    // Total summary: earning, expense, profit
    async totalSummary(req: any, res: any) {
        try {
            console.log("totalSummary - V2");
            const userId = req.user?.userId;

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0-indexed (0 for Jan, 11 for Dec)

            // Define date ranges
            const currentMonthStart = new Date(currentYear, currentMonth, 1);
            const currentMonthEnd = new Date(currentYear, currentMonth + 1, 1); // Next month's 1st day

            const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const previousMonthStart = new Date(previousMonthYear, previousMonth, 1);
            const previousMonthEnd = new Date(currentYear, currentMonth, 1); // Current month's 1st day

            // Helper function to get metrics for a period
            const getMetricsForPeriod = async (startDate: Date, endDate: Date) => {
                const [incomeAgg, expenseAgg] = await Promise.all([
                    Transaction.aggregate([
                        { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Income", date: { $gte: startDate, $lt: endDate } } },
                        { $group: { _id: null, total: { $sum: "$amount" } } },
                    ]),
                    Transaction.aggregate([
                        { $match: { createdBy: new mongoose.Types.ObjectId(userId), type: "Expense", date: { $gte: startDate, $lt: endDate } } },
                        { $group: { _id: null, total: { $sum: "$amount" } } },
                    ]),
                ]);
                const earning = incomeAgg[0]?.total || 0;
                const expense = expenseAgg[0]?.total || 0;
                const profit = earning - expense;
                return { earning, expense, profit };
            };

            const currentMonthMetrics = await getMetricsForPeriod(currentMonthStart, currentMonthEnd);
            const previousMonthMetrics = await getMetricsForPeriod(previousMonthStart, previousMonthEnd);

            // Helper to calculate percentage change
            const calculatePercentageChange = (current: number, previous: number): number | null => {
                if (previous === 0) {
                    if (current === 0) return 0; // No change from zero to zero
                    return current > 0 ? 100 : (current < 0 ? -100 : 0); // Growth from zero
                }
                if (current === previous) return 0; // No change if values are same
                return Math.round(((current - previous) / Math.abs(previous)) * 100);
            };

            const earningChange = calculatePercentageChange(currentMonthMetrics.earning, previousMonthMetrics.earning);
            const expenseChange = calculatePercentageChange(currentMonthMetrics.expense, previousMonthMetrics.expense);
            const profitChange = calculatePercentageChange(currentMonthMetrics.profit, previousMonthMetrics.profit);

            res.json({
                currentMonth: {
                    earning: currentMonthMetrics.earning,
                    expense: currentMonthMetrics.expense,
                    profit: currentMonthMetrics.profit,
                    month: getMonthName(currentMonth) + ' ' + currentYear,
                },
                previousMonth: {
                    earning: previousMonthMetrics.earning,
                    expense: previousMonthMetrics.expense,
                    profit: previousMonthMetrics.profit,
                    month: getMonthName(previousMonth) + ' ' + previousMonthYear,
                },
                percentageChange: {
                    earning: earningChange,
                    expense: expenseChange,
                    profit: profitChange,
                },
            });
        } catch (e) {
            console.log(e);
            res.status(500).json({ error: e.message });
        }
    },
}; 