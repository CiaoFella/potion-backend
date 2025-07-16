import express from "express";
import { contractController } from "../controllers/contractController";
import { auth } from "../middleware/auth";
import { uploadF } from "../middleware/upload";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Contracts
 *   description: Contract management endpoints
 */

/**
 * @swagger
 * /api/contract/trash:
 *   get:
 *     summary: Get deleted contracts
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted contracts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/trash", auth, contractController.getDeletedContract);

/**
 * @swagger
 * /api/contracts:
 *   get:
 *     summary: Get all contracts
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of contracts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contract'
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, contractController.getContracts);

/**
 * @swagger
 * /api/contracts/{contractId}:
 *   get:
 *     summary: Get a contract by ID
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: The contract ID
 *     responses:
 *       200:
 *         description: Contract retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contract'
 *       404:
 *         description: Contract not found
 */
router.get("/:contractId", auth, contractController.getContractsByID);

/**
 * @swagger
 * /api/contracts:
 *   post:
 *     summary: Create a new contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contract'
 *     responses:
 *       201:
 *         description: Contract created successfully
 *       400:
 *         description: Invalid request data
 */
router.post("/", auth, contractController.createContract);

/**
 * @swagger
 * /api/contracts/{contractId}:
 *   put:
 *     summary: Update a contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: The contract ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Contract'
 *     responses:
 *       200:
 *         description: Contract updated successfully
 *       404:
 *         description: Contract not found
 */
router.put("/:contractId", auth, contractController.updateContract);

/**
 * @swagger
 * /api/contracts/{contractId}:
 *   delete:
 *     summary: Delete a contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: The contract ID
 *     responses:
 *       200:
 *         description: Contract deleted successfully
 *       404:
 *         description: Contract not found
 */
router.delete("/:contractId", auth, contractController.deleteContract);

/**
 * @swagger
 * /api/contracts/undo/{contractId}:
 *   put:
 *     summary: Undo contract deletion
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: The contract ID
 *     responses:
 *       200:
 *         description: Contract deletion undone successfully
 *       404:
 *         description: Contract not found
 */
router.put("/undo/:contractId", auth, contractController.undoDeleteContract);

/**
 * @swagger
 * /api/contract/upload:
 *   post:
 *     summary: Upload a contract-related file
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file upload
 */
router.post("/upload", uploadF, auth, contractController.uploadImage);

/**
 * @swagger
 * /api/contract/send-email/{contractId}:
 *   post:
 *     summary: Send a contract via email
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: The contract ID
 *     responses:
 *       200:
 *         description: Contract sent via email
 *       404:
 *         description: Contract not found
 */
router.post("/send-email/:contractId", auth, contractController.sendToEmail);

/**
 * @swagger
 * /api/contract/party-sign/{contractId}:
 *   post:
 *     summary: Sign a contract by a party
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: The contract ID
 *     responses:
 *       200:
 *         description: Contract signed successfully
 *       404:
 *         description: Contract not found
 */
router.post("/party-sign/:contractId", auth, contractController.signContract);

/**
 * @swagger
 * /api/contract/client-sign/{contractId}:
 *   post:
 *     summary: Sign a contract by a client
 *     tags: [Contracts]
 *     responses:
 *       200:
 *         description: Contract signed by the client successfully
 *       404:
 *         description: Contract not found
 */
router.post("/client-sign/:contractId", contractController.signClientContract);

/**
 * @swagger
 * /api/contracts/public/{contractId}:
 *   get:
 *     summary: Get a public contract by ID
 *     tags: [Contracts]
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: The contract ID
 *     responses:
 *       200:
 *         description: Contract retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contract'
 *       404:
 *         description: Contract not found
 */
router.get("/public/:contractId", contractController.getContractByIDPublic);

/**
 * @swagger
 * /api/contract/duplicate/{contractId}:
 *   get:
 *     summary: Duplicate a contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contractId
 *         required: true
 *         schema:
 *           type: string
 *         description: The contract ID
 *     responses:
 *       201:
 *         description: Contract duplicated successfully
 *       404:
 *         description: Contract not found
 */
router.get(
  "/duplicate/:contractId",
  auth,
  contractController.duplicateContract
);

export default router;
