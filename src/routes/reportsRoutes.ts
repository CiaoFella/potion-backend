/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Financial reporting endpoints
 */

import { Router } from "express";
import { reportsController } from "../controllers/reportsController";
import { storedReportsController } from "../controllers/storedReportsController";
import { auth } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Report:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The report ID
 *         userId:
 *           type: string
 *           description: The user who owns this report
 *         type:
 *           type: string
 *           enum: [ProfitAndLoss, BalanceSheet, CashFlow]
 *           description: The type of report
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, error]
 *           description: Current status of the report
 *         period:
 *           type: object
 *           properties:
 *             startDate:
 *               type: string
 *               format: date-time
 *               description: Start date of the report period
 *             endDate:
 *               type: string
 *               format: date-time
 *               description: End date of the report period
 *             durationType:
 *               type: string
 *               enum: [monthly, quarterly, yearly, ytd, custom]
 *               description: Type of duration period
 *         data:
 *           type: object
 *           description: The generated report data
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           description: When the report was generated
 *         lastAccessed:
 *           type: string
 *           format: date-time
 *           description: When the report was last accessed
 * 
 *     ReportRequest:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [ProfitAndLoss, BalanceSheet, CashFlow]
 *           description: Type of report to generate
 *         duration:
 *           type: string
 *           enum: [monthly, quarterly, yearly, ytd]
 *           description: Predefined duration period
 *         startDate:
 *           type: string
 *           format: date
 *           description: Custom start date (if not using duration)
 *         endDate:
 *           type: string
 *           format: date
 *           description: Custom end date (if not using duration)
 *       required:
 *         - type
 */

/**
 * @swagger
 * /api/reports/profit-loss:
 *   get:
 *     summary: Generate a Profit & Loss Statement
 *     tags: [Reports]
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
 *         description: Profit & Loss Statement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   type: object
 *                   properties:
 *                     reportName:
 *                       type: string
 *                     period:
 *                       type: string
 *                     year:
 *                       type: integer
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         byCategory:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           description: Dynamic mapping of revenue categories to amounts
 *                         totalRevenue:
 *                           type: number
 *                     expenses:
 *                       type: object
 *                       properties:
 *                         byCategory:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           description: Dynamic mapping of expense categories to amounts
 *                         totalExpenses:
 *                           type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         totalExpenses:
 *                           type: number
 *                         incomeBeforeTax:
 *                           type: number
 *                         incomeTaxExpense:
 *                           type: number
 *                         netProfit:
 *                           type: number
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     duration:
 *                       type: string
 */
router.get("/profit-loss", auth, reportsController.getProfitAndLoss);

/**
 * @swagger
 * /api/reports/cash-flow:
 *   get:
 *     summary: Generate a Cash Flow Statement
 *     tags: [Reports]
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
 *         description: Predefined duration period
 *     responses:
 *       200:
 *         description: Cash Flow Statement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   type: object
 *                   properties:
 *                     reportName:
 *                       type: string
 *                     period:
 *                       type: string
 *                     operatingActivities:
 *                       type: object
 *                     investingActivities:
 *                       type: object
 *                     financingActivities:
 *                       type: object
 *                     summary:
 *                       type: object
 */
router.get("/cash-flow", auth, reportsController.getCashFlow);

/**
 * @swagger
 * /api/reports/balance-sheet:
 *   get:
 *     summary: Generate a Balance Sheet
 *     tags: [Reports]
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
 *         description: Predefined duration period
 *     responses:
 *       200:
 *         description: Balance Sheet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   type: object
 *                   properties:
 *                     reportName:
 *                       type: string
 *                     period:
 *                       type: string
 *                     assets:
 *                       type: object
 *                     liabilities:
 *                       type: object
 *                     equity:
 *                       type: object
 */
router.get("/balance-sheet", auth, reportsController.getBalanceSheet);

/**
 * @swagger
 * /api/reports/balance-sheet:
 *   get:
 *     summary: Generate a Balance Sheet
 *     tags: [Reports]
 *     responses:
 *       501:
 *         description: Not Implemented
 */
router.get("/balance-sheet", auth, reportsController.getBalanceSheet);

/**
 * @swagger
 * /api/reports/cash-flow:
 *   get:
 *     summary: Generate a Cash Flow Statement
 *     tags: [Reports]
 *     responses:
 *       501:
 *         description: Not Implemented
 */
router.get("/cash-flow", auth, reportsController.getCashFlow);

/**
 * @swagger
 * /api/reports/generate:
 *   post:
 *     summary: Request generation of a new report
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReportRequest'
 *     responses:
 *       200:
 *         description: Report generation started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 reportId:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 */
router.post("/generate", auth, storedReportsController.requestReport);

/**
 * @swagger
 * /api/reports/list:
 *   get:
 *     summary: List all reports for the authenticated user
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ProfitAndLoss, BalanceSheet, CashFlow]
 *         description: Filter by report type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, error]
 *         description: Filter by report status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get("/list", auth, storedReportsController.listReports);

/**
 * @swagger
 * /api/reports/{reportId}:
 *   get:
 *     summary: Get a specific report's details
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the report to retrieve
 *     responses:
 *       200:
 *         description: Report details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       404:
 *         description: Report not found
 * 
 *   delete:
 *     summary: Delete a specific report
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the report to delete
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       404:
 *         description: Report not found
 */
router.get("/:reportId", auth, storedReportsController.getReport);
router.delete("/:reportId", auth, storedReportsController.deleteReport);

export default router; 