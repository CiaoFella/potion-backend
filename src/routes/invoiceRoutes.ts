import express from "express";
import { invoiceController } from "../controllers/invoiceController";
import { auth } from "../middleware/auth";
import { validateInvoice } from "../middleware/validators";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management endpoints
 */

/**
 * @swagger
 * /api/invoice/trash:
 *   get:
 *     summary: Get deleted invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted invoices retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/trash", auth, invoiceController.getDeletedInvoice);

/**
 * @swagger
 * /api/invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/Invoice'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Invalid request data
 */
router.post("/", auth, invoiceController.createInvoice);

/**
 * @swagger
 * /api/invoice/new-number:
 *   get:
 *     summary: Get next invoice number
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: New invoice number retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/new-number", auth, invoiceController.getNextInvoiceNumber);

/**
 * @swagger
 * /api/invoice/{invoiceId}:
 *   put:
 *     summary: Update an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/Invoice'
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *       404:
 *         description: Invoice not found
 */
router.put("/:invoiceId", auth, invoiceController.updateInvoice);

/**
 * @swagger
 * /api/invoice/{invoiceId}:
 *   get:
 *     summary: Get an invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 */
router.get("/:invoiceId", auth, invoiceController.getInvoicesById);

/**
 * @swagger
 * /api/invoices:
 *   get:
 *     summary: Get all invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invoices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, invoiceController.getInvoices);

/**
 * @swagger
 * /api/invoice/duplicate/{invoiceId}:
 *   get:
 *     summary: Duplicate an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     responses:
 *       201:
 *         description: Invoice duplicated successfully
 *       404:
 *         description: Invoice not found
 */
router.get("/duplicate/:invoiceId", auth, invoiceController.duplicateInvoice);

/**
 * @swagger
 * /api/invoice/{invoiceId}:
 *   delete:
 *     summary: Delete an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     responses:
 *       200:
 *         description: Invoice deleted successfully
 *       404:
 *         description: Invoice not found
 */
router.delete("/:invoiceId", auth, invoiceController.deleteInvoice);
router.put("/undo/:invoiceId", auth, invoiceController.undoDeleteInvoice);

/**
 * @swagger
 * /api/invoice/send-email/{invoiceId}:
 *   post:
 *     summary: Send an invoice via email
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     responses:
 *       200:
 *         description: Invoice sent via email successfully
 *       404:
 *         description: Invoice not found
 */
router.post("/send-email/:invoiceId", auth, invoiceController.sendToEmail);

/**
 * @swagger
 * /api/invoice/public/{invoiceId}:
 *   post:
 *     summary: Update an invoice's public status to open
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     responses:
 *       200:
 *         description: Invoice public status updated successfully
 *       404:
 *         description: Invoice not found
 */
router.post("/public/:invoiceId", auth, invoiceController.updateInvoicePublicToOpen);

/**
 * @swagger
 * /api/invoice/public/{invoiceId}:
 *   get:
 *     summary: Get a public invoice by ID
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The invoice ID
 *     responses:
 *       200:
 *         description: Public invoice retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *       404:
 *         description: Invoice not found
 */
router.get("/public/:invoiceId", invoiceController.getInvoicesByIdPublic);

export default router;
