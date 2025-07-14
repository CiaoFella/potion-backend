import express from "express";
import { timeTrackerController } from "../controllers/timeTrackerController";
import { auth } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Time Tracker
 *   description: Endpoints for tracking time logs
 */

/**
 * @swagger
 * /api/timetracker/toggle:
 *   post:
 *     summary: Toggle the time tracker on or off
 *     tags: [Time Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Time tracker toggled successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/toggle", auth, timeTrackerController.toggleTimeTracker);

/**
 * @swagger
 * /api/timetracker:
 *   get:
 *     summary: Get all time tracker records
 *     tags: [Time Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of time tracker records retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, timeTrackerController.getTimeTrackers);

/**
 * @swagger
 * /api/timetracker/range:
 *   get:
 *     summary: Get time tracker records within a specified range
 *     tags: [Time Tracker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the range
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the range
 *     responses:
 *       200:
 *         description: Time tracker records retrieved successfully
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Unauthorized
 */
router.get("/range", auth, timeTrackerController.getRange);

/**
 * @swagger
 * /api/timetracker/today:
 *   get:
 *     summary: Get today's time tracker records
 *     tags: [Time Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's time tracker records retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/today", auth, timeTrackerController.getToday);

/**
 * @swagger
 * /api/timetracker/week:
 *   get:
 *     summary: Get this week's time tracker records
 *     tags: [Time Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: This week's time tracker records retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/week", auth, timeTrackerController.getThisWeek);

/**
 * @swagger
 * /api/timetracker/now:
 *   get:
 *     summary: Get the current active time tracker session
 *     tags: [Time Tracker]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current time tracker session retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/now", auth, timeTrackerController.getCurrentTracker);

export default router;
