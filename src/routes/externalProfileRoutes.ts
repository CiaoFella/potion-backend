import express from 'express';
import {
  getPersonalInfo,
  updatePersonalInfo,
  getPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
} from '../controllers/externalProfileController';
import { rbacAuth } from '../middleware/rbac';

const router = express.Router();

// All routes require authentication
router.use(rbacAuth);

/**
 * @swagger
 * tags:
 *   name: External Profile
 *   description: External user profile management endpoints (accountants and subcontractors)
 */

/**
 * @swagger
 * /api/external-profile/personal:
 *   get:
 *     summary: Get personal information for external users
 *     tags: [External Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal information retrieved successfully
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
 *                     personalInfo:
 *                       type: object
 *                       properties:
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         address:
 *                           type: string
 *                         city:
 *                           type: string
 *                         state:
 *                           type: string
 *                         zipCode:
 *                           type: string
 *                         businessName:
 *                           type: string
 *                         businessType:
 *                           type: string
 *                         taxId:
 *                           type: string
 *                     roleInfo:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - External users only
 */
router.get('/personal', getPersonalInfo);

/**
 * @swagger
 * /api/external-profile/personal:
 *   put:
 *     summary: Update personal information for external users
 *     tags: [External Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               businessName:
 *                 type: string
 *               businessType:
 *                 type: string
 *               taxId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Personal information updated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - External users only
 */
router.put('/personal', updatePersonalInfo);

/**
 * @swagger
 * /api/external-profile/payment-methods:
 *   get:
 *     summary: Get payment methods (subcontractors only)
 *     tags: [External Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
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
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [bank, card]
 *                       accountName:
 *                         type: string
 *                       accountNumber:
 *                         type: string
 *                       routingNumber:
 *                         type: string
 *                       isDefault:
 *                         type: boolean
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - Subcontractors only
 */
router.get('/payment-methods', getPaymentMethods);

/**
 * @swagger
 * /api/external-profile/payment-methods:
 *   post:
 *     summary: Add payment method (subcontractors only)
 *     tags: [External Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - accountNumber
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [bank, card]
 *               accountName:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               routingNumber:
 *                 type: string
 *                 description: Required for bank accounts
 *               cardNumber:
 *                 type: string
 *                 description: Required for cards
 *               expiryDate:
 *                 type: string
 *                 description: Required for cards (MM/YY format)
 *               cvv:
 *                 type: string
 *                 description: Required for cards
 *     responses:
 *       200:
 *         description: Payment method added successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - Subcontractors only
 */
router.post('/payment-methods', addPaymentMethod);

/**
 * @swagger
 * /api/external-profile/payment-methods/{methodId}:
 *   delete:
 *     summary: Remove payment method (subcontractors only)
 *     tags: [External Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment method ID
 *     responses:
 *       200:
 *         description: Payment method removed successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - Subcontractors only
 *       404:
 *         description: Payment method not found
 */
router.delete('/payment-methods/:methodId', removePaymentMethod);

/**
 * @swagger
 * /api/external-profile/payment-methods/{methodId}/default:
 *   patch:
 *     summary: Set default payment method (subcontractors only)
 *     tags: [External Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment method ID
 *     responses:
 *       200:
 *         description: Default payment method updated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied - Subcontractors only
 *       404:
 *         description: Payment method not found
 */
router.patch('/payment-methods/:methodId/default', setDefaultPaymentMethod);

export default router;
