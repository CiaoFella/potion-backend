import express from 'express';
import { userTaxWriteOffController } from '../controllers/userTaxWriteOffController';

const router = express.Router();

/**
 * @swagger
 * /write-offs:
 *   post:
 *     summary: Create a single tax write-off for a transaction
 *     tags:
 *       - User Tax Write-Offs
 *     parameters:
 *       - in: header
 *         name: X-USER-ID
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user making the request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - transaction_amount
 *               - saving_amount
 *               - old_category
 *               - new_category
 *             properties:
 *               transactionId:
 *                 type: string
 *               transaction_amount:
 *                 type: number
 *               saving_amount:
 *                 type: number
 *               old_category:
 *                 type: string
 *               new_category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Write-off recorded successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', userTaxWriteOffController.createSingleWriteOff);

/**
 * @swagger
 * /write-offs/bulk:
 *   post:
 *     summary: Create multiple tax write-offs for transactions
 *     tags:
 *       - User Tax Write-Offs
 *     parameters:
 *       - in: header
 *         name: X-USER-ID
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user making the request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - transactionId
 *                 - transaction_amount
 *                 - saving_amount
 *                 - old_category
 *                 - new_category
 *               properties:
 *                 transactionId:
 *                   type: string
 *                 transaction_amount:
 *                   type: number
 *                 saving_amount:
 *                   type: number
 *                 old_category:
 *                   type: string
 *                 new_category:
 *                   type: string
 *     responses:
 *       201:
 *         description: Write-offs recorded successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/bulk', userTaxWriteOffController.createMultipleWriteOffs);

/**
 * @swagger
 * /write-offs:
 *   get:
 *     summary: List tax write-offs for the authenticated user
 *     tags:
 *       - User Tax Write-Offs
 *     parameters:
 *       - in: header
 *         name: X-USER-ID
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user making the request
 *     responses:
 *       200:
 *         description: A list of user write-offs
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', userTaxWriteOffController.listUserWriteOffs);

export default router;
