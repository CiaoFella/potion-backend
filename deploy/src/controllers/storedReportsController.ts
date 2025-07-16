import { Report } from "../models/Report";
import mongoose from "mongoose";
import { reportsController } from "./reportsController";

// Move generateReport outside as standalone function
async function generateReport(reportId: string) {
    const report = await Report.findById(reportId);
    if (!report) return;

    try {
        // Update status to processing
        report.status = 'processing';
        await report.save();

        let reportData;
        // Generate appropriate report based on type
        switch (report.type) {
            case 'ProfitAndLoss':
                reportData = await reportsController.generateProfitAndLoss(
                    report.userId.toString(),
                    report.period.startDate,
                    report.period.endDate
                );
                break;
            // Add other report types here as they're implemented
            default:
                throw new Error('Unsupported report type');
        }

        // Update report with generated data
        report.status = 'completed';
        report.data = reportData;
        report.generatedAt = new Date();
        await report.save();

    } catch (error) {
        report.status = 'error';
        report.error = {
            message: error.message,
            details: error
        };
        await report.save();
    }
}

export const storedReportsController = {
    // Request a new report generation
    async requestReport(req: any, res: any) {
        try {
            const userId = req.user?.userId;
            const { type, startDate, endDate, duration } = req.body;

            // Validate report type
            if (!['ProfitAndLoss', 'BalanceSheet', 'CashFlow'].includes(type)) {
                return res.status(400).json({ error: 'Invalid report type' });
            }

            let start: Date;
            let end: Date = new Date();
            let durationType = duration || 'custom';

            // Calculate period based on duration
            if (duration) {
                switch (duration.toLowerCase()) {
                    case 'monthly':
                        start = new Date();
                        start.setDate(1);
                        break;
                    case 'quarterly':
                        start = new Date();
                        start.setMonth(start.getMonth() - 3);
                        break;
                    case 'yearly':
                        start = new Date();
                        start.setFullYear(start.getFullYear() - 1);
                        break;
                    case "quart1": // this should be the first quarter of the year
                        start = new Date(new Date().getFullYear(), 0, 1);
                        end = new Date(new Date().getFullYear(), 2, 31);
                        break;
                    case "quart2":
                        start = new Date(new Date().getFullYear(), 3, 1)
                        end = new Date(new Date().getFullYear(), 5, 30);
                        break;
                    case "quart3":
                        start = new Date(new Date().getFullYear(), 6, 1);
                        end = new Date(new Date().getFullYear(), 8, 30);
                        break;
                    case "quart4":
                        start = new Date(new Date().getFullYear(), 9, 1);
                        end = new Date(new Date().getFullYear(), 11, 31);
                        break;
                    case 'ytd':
                        start = new Date(new Date().getFullYear(), 0, 1);
                        break;
                    default:
                        return res.status(400).json({ error: 'Invalid duration type' });
                }
            } else if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
                durationType = 'custom';
            } else {
                return res.status(400).json({ error: 'Either duration or start/end dates must be provided' });
            }
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 0, 0);

            // Create new report record
            const report = await Report.create({
                userId: new mongoose.Types.ObjectId(userId),
                type,
                status: 'pending',
                period: {
                    startDate: start,
                    endDate: end,
                    durationType
                }
            });

            // Start async report generation
            generateReport(report._id.toString()).catch(error => {
                console.error('Error generating report:', error);
            });

            res.json({
                message: 'Report generation started',
                reportId: report._id,
                status: 'pending'
            });

        } catch (error) {
            console.error('Error requesting report:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // List all reports for a user
    async listReports(req: any, res: any) {
        try {
            const userId = req.user?.userId;
            const { type, status, page, limit } = req.query;

            const query: any = {
                userId: new mongoose.Types.ObjectId(userId)
            };

            if (type) query.type = type;
            if (status) query.status = status;

            let queryChain = Report.find(query)
                .sort({ createdAt: -1 })

            if (limit && page) {
                queryChain = queryChain.skip((page - 1) * (limit || 0));
                queryChain = queryChain.limit(limit);
            }

            const reports = await queryChain.select('-data');// Exclude the full report data for list view

            const total = await Report.countDocuments(query);

            res.json({
                reports,
                pagination: {
                    page: parseInt(page||1),
                    limit: parseInt(limit||total),
                    total,
                    pages: Math.ceil(total / (limit||total))
                }
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get a specific report's details
    async getReport(req: any, res: any) {
        try {
            const userId = req.user?.userId;
            const { reportId } = req.params;

            const report = await Report.findOne({
                _id: reportId,
                userId: new mongoose.Types.ObjectId(userId)
            });

            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }

            // Update last accessed timestamp
            report.lastAccessed = new Date();
            await report.save();

            res.json(report);

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: error.message });
        }
    },

    // Delete a report
    async deleteReport(req: any, res: any) {
        try {
            const userId = req.user?.userId;
            const { reportId } = req.params;

            const report = await Report.findOneAndDelete({
                _id: reportId,
                userId: new mongoose.Types.ObjectId(userId)
            });

            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }

            res.json({ message: 'Report deleted successfully' });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}; 