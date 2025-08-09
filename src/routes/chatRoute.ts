import express from 'express';
import { chatController } from '../controllers/chatController';
import { auth } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Endpoints for managing Chat
 */

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Create a new chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: chat name
 *     responses:
 *       201:
 *         description: chat created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth, chatController.createChat);

/**
 * @swagger
 * /api/chat/{id}:
 *   put:
 *     summary: Update a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chat to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: chat updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: chat not found
 */
router.put('/:id', auth, chatController.updateChat);

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Retrieve all chats for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved chats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Unique identifier for the chat
 *                   name:
 *                     type: string
 *                     description: Name of the chat
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp of chat creation
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', auth, chatController.getChats);

/**
 * @swagger
 * /api/chat/{id}:
 *   get:
 *     summary: Get a specific chat by ID
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chat to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Unique identifier for the chat
 *                 name:
 *                   type: string
 *                   description: Name of the chat
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp of chat creation
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp of chat update
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.get('/:id', auth, chatController.getChatById);

/**
 * @swagger
 * /api/chat/{id}:
 *   delete:
 *     summary: Delete a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chat to delete
 *     responses:
 *       200:
 *         description: Chat deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 */
router.delete('/:id', auth, chatController.deleteChat);

/**
 * @swagger
 * /api/chat/{id}/messages:
 *   get:
 *     summary: Get all messages for a specific chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chat to get messages for
 *     responses:
 *       200:
 *         description: Successfully retrieved messages
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.get('/:id/messages', auth, chatController.getChatMessages);

/**
 * @swagger
 * /api/chat/{id}/messages:
 *   post:
 *     summary: Add a new message to a chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the chat to add message to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, assistant, system]
 *               content:
 *                 type: string
 *               metadata:
 *                 type: object
 *               attachments:
 *                 type: array
 *     responses:
 *       201:
 *         description: Message added successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 *       500:
 *         description: Server error
 */
router.post('/:id/messages', auth, chatController.addMessage);

export default router;
