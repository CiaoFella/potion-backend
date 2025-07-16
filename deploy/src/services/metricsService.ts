import { UserActivityTracker } from "../models/UserActivityTracker";
import { User } from "../models/User";

export class MetricsService {
  async getTotalUsers() {
    return User.countDocuments();
  }

  async getWeeklySignups() {
    return this._getPeriodicSignups(7);
  }

  async getMonthlySignups() {
    return this._getPeriodicSignups(30);
  }

  // Private method for accurate periodic signups
  async _getPeriodicSignups(days) {
    const results = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            week: { $week: "$createdAt" },
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      { $limit: Math.round(days / 7) } // Approximate weeks in period
    ]);

    const total = results.reduce((sum, item) => sum + item.count, 0);
    return Math.round(total / (days / 7));
  }

  async getMonthlyActiveUsers() {
    const activityData = await UserActivityTracker.aggregate([
      {
        $match: {
          type: "tool_usage",
          createdAt: { 
            $gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      },
      {
        $group: {
          _id: {
            user: "$user",
            week: { $week: "$createdAt" }
          }
        }
      },
      {
        $group: {
          _id: "$_id.user",
          activeWeeks: { $sum: 1 }
        }
      },
      {
        $project: {
          userId: "$_id",
          activityScore: { 
            $divide: ["$activeWeeks", 4] // 4 weeks in month
          }
        }
      }
    ]);

    // Count users with at least 25% weekly activity as "active"
    return activityData.filter(user => user.activityScore >= 0.25).length;
  }

  async getToolsUsageMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const toolUsage = await UserActivityTracker.aggregate([
      {
        $match: {
          type: "tool_usage",
          createdAt: { $gte: startOfMonth },
          tool: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: "$tool",
          monthUsers: { $addToSet: "$user" }
        }
      },
      {
        $project: {
          _id: 0,
          tool: "$_id",
          monthUsers: { $size: "$monthUsers" }
        }
      }
    ]);

    // Convert array to object with tool as key
    const result = {};
    toolUsage.forEach(item => {
      result[item.tool] = {
        monthUsers: item.monthUsers
      };
    });

    return result;
  }

  // Get all metrics with additional context
  async getAllMetrics() {
    const [totalUsers, weeklySignups, monthlySignups, mau, toolsUsage] = await Promise.all([
      this.getTotalUsers(),
      this.getWeeklySignups(),
      this.getMonthlySignups(),
      this.getMonthlyActiveUsers(),
      this.getToolsUsageMetrics()
    ]);

    return {
      totalUsers,
      weeklyNewSignups: weeklySignups,
      monthlyNewSignups: monthlySignups,
      monthlyActiveUsers: mau,
      activityRate: totalUsers > 0 
        ? ((mau / totalUsers) * 100).toFixed(1) + "%" 
        : "0%",
      toolsUsage
    };
  }
}