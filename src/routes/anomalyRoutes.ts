import express from "express";
import { anomaliesController } from "../controllers/anomaliesController";
import { auth } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Anomalies
 *   description: Endpoints for tracking anomalies
 */

/**
 * @swagger
 * /api/anomalies:
 *   post:
 *     summary: Create a new anomaly
 *     tags: [Anomalies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Anomaly created successfully
 *
 *       401:
 *         description: Unauthorized
 */
router.post("/", auth, anomaliesController.createAnomaly);

/**
     * @swagger
     * /api/anomalies:
     *   get:
     *     summary: Get all anomalies   
     *     tags: [Anomalies]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Anomalies retrieved successfully
     *         content: 
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: string
     *                     description: Unique identifier for the anomaly
     *                   title:
     *                     type: string
     *                   description:
     *                     type: string
     *                     description: Description of the anomaly
     *                   severity:
     *                     type: string
     *                     description: Severity of the anomaly
     *                   status:
     *                     type: string
     *                     enum: ["pending", "resolved", "dismissed"]
     *                     description: Status of the anomaly
     *                   isResolved:
     *                     type: boolean
     *                     description: Whether the anomaly is resolved
     *       401:   
     *         description: Unauthorized
     */
router.get("/", auth, anomaliesController.getAnomalies);

export default router;
