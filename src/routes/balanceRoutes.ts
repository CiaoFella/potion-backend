import express from "express";
import { balanceController } from "../controllers/balanceController";
import { auth } from "../middleware/auth";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

/**
 * GET /api/balances
 * Get all account balances for the authenticated user
 */
router.get("/", balanceController.getUserBalances);

/**
 * GET /api/balances/calculate
 * Calculate balances for all user accounts
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - forceRecalculation: boolean (optional, default: false)
 * - includeHistoricalSnapshots: boolean (optional, default: false)
 * - reconcileWithPlaid: boolean (optional, default: true)
 */
router.get("/calculate", balanceController.calculateAllUserBalances);

/**
 * GET /api/balances/reconciliation
 * Get reconciliation status for all user accounts
 */
router.get("/reconciliation", balanceController.getReconciliationStatus);

/**
 * POST /api/balances/recalculate
 * Force recalculation of balances for all accounts
 */
router.post("/recalculate", balanceController.recalculateBalances);

/**
 * GET /api/balances/:accountId
 * Calculate balance for a specific account
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - forceRecalculation: boolean (optional, default: false)
 * - includeHistoricalSnapshots: boolean (optional, default: false)
 * - reconcileWithPlaid: boolean (optional, default: true)
 */
router.get("/:accountId", balanceController.calculateAccountBalance);

/**
 * GET /api/balances/:accountId/date-range
 * Get balance for a specific date range with daily snapshots
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 */
router.get("/:accountId/date-range", balanceController.getBalanceForDateRange);

/**
 * GET /api/balances/:accountId/history
 * Get balance history for an account
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - snapshotType: string (optional) - daily, weekly, monthly, sync, manual
 */
router.get("/:accountId/history", balanceController.getBalanceHistory);

/**
 * POST /api/balances/:accountId/beginning-balance
 * Set beginning balance for an account
 * Body:
 * - beginningBalance: number (required)
 * - effectiveDate: ISO date string (optional, defaults to now)
 */
router.post(
  "/:accountId/beginning-balance",
  balanceController.setBeginningBalance
);

/**
 * POST /api/balances/:accountId/recalculate
 * Force recalculation of balance for a specific account
 */
router.post("/:accountId/recalculate", balanceController.recalculateBalances);

export default router;
