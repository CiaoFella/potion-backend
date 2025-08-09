import express from 'express';
import { transactionCategoryController } from '../controllers/transactionCategoryController';

const router = express.Router();

/**
 * @swagger
 * /api/transaction-category/{transactionId}:
 *   post:
 *     summary: Handle transaction categorization chat or direct categorization
 *     tags: [Transaction Categorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [category, chat]
 *           default: category
 *         description: Type of categorization request
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Chat message (required for chat type)
 *               currentCategory:
 *                 type: string
 *                 description: Current category of the transaction
 *     responses:
 *       200:
 *         description: Categorization successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                       reasoning:
 *                         type: string
 *                 description:
 *                   type: string
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.post('/:id', transactionCategoryController.handleTransactionChat);

/**
 * @swagger
 * /api/transaction-category-messages/{transactionId}:
 *   get:
 *     summary: Get chat history for a transaction
 *     tags: [Transaction Categorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Chat history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role:
 *                         type: string
 *                         enum: [user, assistant]
 *                       content:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get('/:id', transactionCategoryController.getChatHistory);

/**
 * @swagger
 * /api/transaction-manual-categorize/{transactionId}:
 *   post:
 *     summary: Manually trigger categorization for a transaction
 *     tags: [Transaction Categorization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Manual categorization successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                           confidence:
 *                             type: number
 *                           reasoning:
 *                             type: string
 *                     description:
 *                       type: string
 *                     primaryCategory:
 *                       type: string
 *                     confidence:
 *                       type: number
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.post('/manual/:id', transactionCategoryController.manualCategorization);

export default router;
