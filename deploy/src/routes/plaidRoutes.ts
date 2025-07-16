import express from 'express';
import { plaidController } from '../controllers/plaidController';
import { auth } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Plaid
 *   description: Plaid integration endpoints
 */

/**
 * @swagger
 * /api/plaid/link:
 *   post:
 *     summary: Create a Plaid link token
 *     description: Creates a link token for Plaid Link to connect bank accounts
 *     tags: [Plaid]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Link token created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 link_token:
 *                   type: string
 *                 expiration:
 *                   type: string
 *                 request_id:
 *                   type: string
 */
router.post('/link', auth, plaidController.createLinkToken);

/**
 * @swagger
 * /api/plaid/exchange:
 *   post:
 *     summary: Exchange public token for access token
 *     description: Exchanges a public token for an access token and stores the Plaid item
 *     tags: [Plaid]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               public_token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token exchanged successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlaidItem'
 */
router.post('/exchange', auth, plaidController.exchangePublicToken);

/**
 * @swagger
 * /api/plaid/items:
 *   get:
 *     summary: Get user's Plaid items
 *     description: Retrieves all Plaid items connected by the user
 *     tags: [Plaid]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of Plaid items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PlaidItem'
 */
router.get('/items', auth, plaidController.getPlaidItems);

/**
 * @swagger
 * /api/plaid/items/{plaidItemId}/sync:
 *   post:
 *     summary: Sync transactions for a Plaid item
 *     description: Manually triggers a sync of transactions for a specific Plaid item
 *     tags: [Plaid]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: plaidItemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transactions synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/items/:plaidItemId/sync', auth, plaidController.syncTransactions);

/**
 * @swagger
 * /api/plaid/items/{plaidItemId}:
 *   delete:
 *     summary: Delete a Plaid item
 *     description: Removes a Plaid item and its associated data
 *     tags: [Plaid]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: plaidItemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plaid item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/items/:plaidItemId', auth, plaidController.deletePlaidItem);

/**
 * @swagger
 * /api/plaid/webhook:
 *   post:
 *     summary: Handle Plaid webhook
 *     description: Receives webhook notifications from Plaid
 *     tags: [Plaid]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               webhook_type:
 *                 type: string
 *               webhook_code:
 *                 type: string
 *               item_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 */
router.post('/webhook', plaidController.handleWebhook);

export default router; 