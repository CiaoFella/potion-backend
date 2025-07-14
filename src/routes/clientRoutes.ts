import express from "express";
import { clientController } from "../controllers/clientController";
import { auth } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Client management endpoints
 */

/**
 * @swagger
 * /api/client/trash:
 *   get:
 *     summary: Get deleted clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted clients retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/trash", auth, clientController.getDeletedClient);

/**
 * @swagger
 * /api/client:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/Client'
 *     responses:
 *       201:
 *         description: Client created successfully
 *       400:
 *         description: Invalid request data
 */
router.post("/", auth, clientController.createClient);

/**
 * @swagger
 * /api/client/{clientId}:
 *   put:
 *     summary: Update client information
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The client's ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       400:
 *         description: Invalid request data
 */
router.put("/:clientId", auth, clientController.updateClient);

/**
 * @swagger
 * /api/client:
 *   get:
 *     summary: Get all clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of clients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *               $ref: '#/components/schemas/Client'
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, clientController.getClients);

/**
 * @swagger
 * /api/client/{clientId}:
 *   get:
 *     summary: Get a client by ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The client's ID
 *     responses:
 *       200:
 *         description: Client retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       404:
 *         description: Client not found
 */
router.get("/:clientId", auth, clientController.getClientsByID);

/**
 * @swagger
 * /api/client/duplicate/{clientId}:
 *   get:
 *     summary: Duplicate a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The client's ID
 *     responses:
 *       201:
 *         description: Client duplicated successfully
 *       404:
 *         description: Client not found
 */
router.get("/duplicate/:clientId", auth, clientController.duplicateClient);

/**
 * @swagger
 * /api/client/{clientId}:
 *   delete:
 *     summary: Delete a client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: The client's ID
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Client'
 *       404:
 *         description: Client not found
 */
router.delete("/:clientId", auth, clientController.deleteClient);

router.put("/undo/:clientId", auth, clientController.undoDeleteClient);

export default router;
