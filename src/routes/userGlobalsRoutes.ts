import express from "express";
import { auth } from "../middleware/auth";
import { userGlobalController } from "../controllers/globalController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: User Global Values
 *   description: Endpoints for managing global user values
 */

/**
 * @swagger
 * /api/user-global/tax-goal:
 *   get:
 *     summary: Get the user's tax write-off goal
 *     tags: [User Global Values]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the user's tax write-off goal
 *         content:
 *           application/json:
 *             example:
 *               taxWriteOffGoal: 5000
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No data found
 */
router.get("/tax-goal", auth,  userGlobalController.getTaxWriteOffGoal);

/**
 * @swagger
 * /api/user-global/tax-goal:
 *   post:
 *     summary: Set or update the user's tax write-off goal
 *     tags: [User Global Values]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taxWriteOffGoal:
 *                 type: number
 *                 example: 7000
 *     responses:
 *       200:
 *         description: Goal updated
 *         content:
 *           application/json:
 *             example:
 *               message: "Goal updated"
 *               taxWriteOffGoal: 7000
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/tax-goal", auth,  userGlobalController.setTaxWriteOffGoal);

/**
 * @swagger
 * /api/user-global:
 *   patch:
 *     summary: Update multiple global values for the user
 *     tags: [User Global Values]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             example:
 *               taxWriteOffGoal: 8000
 *               anotherField: "value"
 *     responses:
 *       200:
 *         description: Global values updated
 *         content:
 *           application/json:
 *             example:
 *               message: "Global values updated"
 *               updatedFields:
 *                 taxWriteOffGoal: 8000
 *                 anotherField: "value"
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.patch("/", auth,  userGlobalController.updateGlobalValues);

/**
 * @swagger
 * /api/user-global:
 *   get:
 *     summary: Get all global values for the user
 *     tags: [User Global Values]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the user's global values
 *         content:
 *           application/json:
 *             example:
 *               taxWriteOffGoal: 8000
 *               anotherField: "value"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No data found
 */
router.get("/", auth,  userGlobalController.getGlobalValues);

export default router;
