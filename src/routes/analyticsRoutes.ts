/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics and dashboard endpoints
 */

import { Router } from "express";
import { analyticsController } from "../controllers/analyticsController";
import { auth } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /api/analytics/total-spending:
 *   get:
 *     summary: Get total spending by category
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (optional)
 *     responses:
 *       200:
 *         description: Total spending and breakdown by category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       percent:
 *                         type: number
 */
router.get("/total-spending", auth, analyticsController.totalSpending);

/**
 * @swagger
 * /api/analytics/income-vs-expense:
 *   get:
 *     summary: Get income vs expense for a period
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (optional)
 *     responses:
 *       200:
 *         description: Daily income and expense
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       income:
 *                         type: number
 *                       expense:
 *                         type: number
 */
router.get("/income-vs-expense", auth, analyticsController.incomeVsExpense);

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Get trend analysis (top growing expenses and revenue sources)
 *     tags: [Analytics]    
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (optional)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (optional)
 *     responses:
 *       200:
 *         description: Trend analysis data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topExpenses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       growth:
 *                         type: number
 *                 topRevenue:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       growth:
 *                         type: number
 */
router.get("/trends", auth, analyticsController.trends);

/**
 * @swagger
 * /api/analytics/insights:
 *   get:
 *     summary: Get AI smart insights for analytics
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: AI smart insights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profitAlert:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                 expenseTrend:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                 cashFlowHealth:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 */
router.get("/insights", auth, analyticsController.insights);

/**
 * @swagger
 * /api/analytics/total-summary:
 *   get:
 *     summary: Get total earning, total expense, and total profit
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Total earning, expense, and profit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEarning:
 *                   type: number
 *                 totalExpense:
 *                   type: number
 *                 totalProfit:
 *                   type: number
 */
router.get("/total-summary", auth, analyticsController.totalSummary);

/**
 * @swagger
 * /api/analytics/profit-loss:
 *   get:
 *     summary: Get detailed profit and loss statement
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom date range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom date range (YYYY-MM-DD)
 *       - in: query
 *         name: duration
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly, ytd]
 *         description: Predefined duration period (overrides startDate/endDate if provided)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for the statement (default - current year, used if no duration or date range provided)
 *     responses:
 *       200:
 *         description: Detailed profit and loss statement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profitAndLoss:
 *                   type: object
 *                   properties:
 *                     year:
 *                       type: integer
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         salesRevenue:
 *                           type: number
 *                         serviceRevenue:
 *                           type: number
 *                         interestRevenue:
 *                           type: number
 *                         gainOnSaleOfAssets:
 *                           type: number
 *                         otherRevenue:
 *                           type: number
 *                         totalRevenue:
 *                           type: number
 *                     expenses:
 *                       type: object
 *                       properties:
 *                         advertising:
 *                           type: number
 *                         insurance:
 *                           type: number
 *                         officeSupplies:
 *                           type: number
 *                         travel:
 *                           type: number
 *                         delivery:
 *                           type: number
 *                         otherExpenses:
 *                           type: number
 *                         totalExpenses:
 *                           type: number
 *                     incomeBeforeTax:
 *                       type: number
 *                     incomeTaxExpense:
 *                       type: number
 *                     netProfit:
 *                       type: number
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     duration:
 *                       type: string
 */
router.get("/profit-loss", auth, analyticsController.profitLoss);

export default router; 