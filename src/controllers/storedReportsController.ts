import jwt from 'jsonwebtoken';
import { Report } from '../models/Report';
import mongoose from 'mongoose';
import { reportsController } from './reportsController';
import { UserRoles, UserRoleType } from '../models/UserRoles';
import { config } from '../config/config';

interface ListReportsQuery {
  type?: string;
  status?: string;
  page?: string;
  limit?: string;
}

async function generateReport(reportId: string) {
  const report = await Report.findById(reportId);
  if (!report) return;

  try {
    report.status = 'processing';
    await report.save();

    let reportData;
    switch (report.type) {
      case 'ProfitAndLoss':
        reportData = await (reportsController.generateProfitAndLoss as any)(
          report.userId.toString(),
          report.period.startDate,
          report.period.endDate,
          report.projectIds ?? [],
        );
        break;
      case 'CashFlow':
        reportData = await (reportsController.generateCashFlow as any)(
          report.userId.toString(),
          report.period.startDate,
          report.period.endDate,
          report.projectIds ?? [],
        );
        break;
      case 'BalanceSheet':
        reportData = await (reportsController.generateBalanceSheet as any)(
          report.userId.toString(),
          report.period.startDate,
          report.period.endDate,
          report.projectIds ?? [],
        );
        break;
      case 'ProjectProfitability':
        reportData = await (reportsController.generateProjectProfitability as any)(
          report.userId.toString(),
          report.period.startDate,
          report.period.endDate,
          report.projectIds ?? [],
        );
        break;
      default:
        throw new Error('Unsupported report type');
    }

    report.status = 'completed';
    report.data = reportData;
    report.generatedAt = new Date();
    await report.save();
  } catch (error) {
    report.status = 'error';
    report.error = {
      message: (error as any).message,
      details: error instanceof Error ? (error as Error).stack : String(error),
    };
    await report.save();

    console.error('Report generation failed:', {
      reportId: report._id,
      type: report.type,
      userId: report.userId,
      error: (error as any).message,
    });
  }
};

export const storedReportsController = {
  async requestReport(req, res) {
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

      const targetUserId =
        decoded.roleType === UserRoleType.ACCOUNTANT
          ? req.header('X-User-ID') || decoded.businessOwnerId
          : decoded.userId;

      if (!targetUserId) {
        return res.status(400).json({
          error: "Missing business owner ID. Make sure you've selected a client.",
        });
      }

      if (decoded.roleType === UserRoleType.ACCOUNTANT) {
        const hasAccess = await UserRoles.findOne({
          user: decoded.userId,
          businessOwner: targetUserId,
          roleType: UserRoleType.ACCOUNTANT,
          status: 'active',
        });

        if (!hasAccess) {
          return res
            .status(403)
            .json({ error: 'You do not have access to generate reports for this user' });
        }
      }

            const { type, startDate, endDate, duration } = req.body;

      if (!['ProfitAndLoss', 'BalanceSheet', 'CashFlow', 'ProjectProfitability'].includes(type)) {
        return res.status(400).json({ error: 'Invalid report type' });
      }

      let start: Date;
      let end: Date;

      const d = typeof duration === 'string' ? duration.toLowerCase().trim() : undefined;
      const allowed = new Set(['monthly', 'quarterly', 'yearly', 'ytd']);

      if (d && allowed.has(d)) {
        const now = new Date();
        if (d === 'monthly') {
          end = now;
          start = new Date(now);
          start.setMonth(start.getMonth() - 1);
        } else if (d === 'quarterly') {
          end = now;
          start = new Date(now);
          start.setMonth(start.getMonth() - 3);
        } else if (d === 'yearly') {
          end = now;
          start = new Date(now);
          start.setFullYear(start.getFullYear() - 1);
        } else {
          end = now;
          start = new Date(now.getFullYear(), 0, 1);
        }
      } else if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({ error: 'Invalid startDate or endDate' });
        }
      } else if (!d || d === 'custom' || d === 'all' || d === 'none' || d === 'default') {
        const year = new Date().getFullYear();
        start = new Date(year, 0, 1);
        end = new Date(year + 1, 0, 1);
      } else {
        return res.status(400).json({ error: 'Invalid duration' });
      }

      const durationType = allowed.has(d || '') ? d : 'custom';

      const report = await Report.create({
        userId: new mongoose.Types.ObjectId(targetUserId),
        type,
        status: 'pending',
        period: {
          startDate: start,
          endDate: end,
          durationType,
        },
        requestedBy: decoded.userId,
      });

      generateReport(report._id.toString()).catch((error) => {
        console.error('Error generating report:', error);
      });

      return res.json({
        message: 'Report generation started',
        reportId: report._id,
        status: 'pending',
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(500).json({ error: 'Failed to request report' });
    }
  },

async listReports(req, res) {
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

    // Verify accountant access
    if (decoded.roleType === UserRoleType.ACCOUNTANT) {
      const hasAccess = await UserRoles.findOne({
        user: decoded.userId,
        businessOwner: targetUserId,
        roleType: UserRoleType.ACCOUNTANT,
        status: 'active'
      }).lean();

      if (!hasAccess) {
        return res.status(403).json({
          error: 'You do not have access to this user\'s reports'
        });
      }
    }

    const { type, status, page = '1', limit = '10' } = req.query;

    // Build query
    const query: Record<string, any> = {
      userId: new mongoose.Types.ObjectId(targetUserId)
    };

    if (type) query.type = type;
    if (status) query.status = status;

    // Execute query with pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-data')
        .lean(),
      Report.countDocuments(query)
    ]);

    return res.json({
      reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Error listing reports:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
},

  // Get a specific report's details
  async getReport(req: any, res: any) {
    try {
      const userId = req.user?.userId;
      const { reportId } = req.params;

      const report = await Report.findOne({
        _id: reportId,
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Update last accessed timestamp
      report.lastAccessed = new Date();
      await report.save();

      res.json(report);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a report
    async deleteReport(req, res) {
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
  
      // Verify accountant access
      if (decoded.roleType === UserRoleType.ACCOUNTANT) {
        const hasAccess = await UserRoles.findOne({
          user: decoded.userId,
          businessOwner: targetUserId,
          roleType: UserRoleType.ACCOUNTANT,
          status: 'active'
        });
  
        if (!hasAccess) {
          return res.status(403).json({
            error: 'You do not have access to this user\'s reports'
          });
        }
      }
  
      const { reportId } = req.params;
  
      const report = await Report.findOneAndDelete({
        _id: reportId,
        userId: new mongoose.Types.ObjectId(targetUserId)
      });
  
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }
  
      return res.json({ message: 'Report deleted successfully' });
  
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }
      
      return res.status(500).json({ error: 'Failed to delete report' });
    }
  }
};
