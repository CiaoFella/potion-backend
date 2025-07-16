import express from "express";
import { auth } from "../middleware/auth";
import { crmController } from "../controllers/crmController";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: CRM
 *   description: Customer Relationship Management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CRMCategory:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "VIP Clients"
 *     CRMItem:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "johndoe@gmail.com"
 *         companyName:
 *           type: string
 *           example: "Soft Labs"
 *         category:
 *           type: string
 *           format: mongo-id
 *           example: "507f1f77bcf86cd799439013"
 *         description:
 *           type: string
 *           example: "Follow up meeting scheduled"
 *         lastContact:
 *           type: string
 *           format: date-time
 *           example: "2023-08-15T14:30:00Z"
 */

// ==================== Categories Routes ====================
/**
 * @swagger
 * /api/crm/categories:
 *   post:
 *     summary: Create a new CRM category
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CRMCategory'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "CRM category created successfully"
 *               category: 
 *                 name: "VIP Clients"
 *                 _id: "507f1f77bcf86cd799439013"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/categories", auth, crmController.createCategory);

/**
 * @swagger
 * /api/crm/categories:
 *   get:
 *     summary: Get all active CRM categories
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               - _id: "507f1f77bcf86cd799439013"
 *                 name: "VIP Clients"
 *                 createdAt: "2023-08-01T10:00:00Z"
 *       401:
 *         description: Unauthorized
 */
router.get("/categories", auth, crmController.getCategories);

/**
 * @swagger
 * /api/crm/categories/{categoryId}:
 *   put:
 *     summary: Update a CRM category
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439013"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CRMCategory'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.put("/categories/:categoryId", auth, crmController.updateCategory);

/**
 * @swagger
 * /api/crm/categories/{categoryId}:
 *   delete:
 *     summary: Delete a CRM category (soft delete)
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Category marked as deleted
 *       404:
 *         description: Category not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/categories/:categoryId", auth, crmController.deleteCategory);

/**
 * @swagger
 * /api/crm/categories/deleted:
 *   get:
 *     summary: Get all deleted CRM categories
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted categories
 *       401:
 *         description: Unauthorized
 */
router.get("/categories/deleted", auth, crmController.getDeletedCategories);

// ==================== CRM Items Routes ====================
/**
 * @swagger
 * /api/crm/items:
 *   post:
 *     summary: Create a new CRM item
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CRMItem'
 *     responses:
 *       201:
 *         description: CRM item created successfully
 *         content:
 *           application/json:
 *             example:
 *               message: "CRM item created successfully"
 *               item:
 *                 name: "John Doe"
 *                 email: "johndoe@gmail.com"
 *                 companyName: "Soft Labs"
 *                 category: "507f1f77bcf86cd799439013"
 *                 description: "Follow up meeting scheduled"
 *                 lastContact: "2023-08-15T14:30:00Z"
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post("/items", auth, crmController.createItem);

/**
 * @swagger
 * /api/crm/items:
 *   get:
 *     summary: Get all active CRM items
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of CRM items with populated data
 *         content:
 *           application/json:
 *             example:
 *               - _id: "607f1f77bcf86cd799439014"
 *                 name: "John Doe"
 *                 email: "johndoe@gmail.com"
 *                 companyName: "Soft Labs"
 *                 description: "Follow up meeting scheduled"
 *                 lastContact: "2023-08-15T14:30:00Z"
 *       401:
 *         description: Unauthorized
 */
router.get("/items", auth, crmController.getItems);

/**
 * @swagger
 * /api/crm/items/{itemId}:
 *   get:
 *     summary: Get a CRM item by ID
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         example: "607f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: CRM item retrieved successfully
 *         content:
 *           application/json:
 *             example:
 *               _id: "607f1f77bcf86cd799439014"
 *               name: "John Doe"
 *               email: "johndoe@gmail.com"
 *               companyName: "Soft Labs"
 *               description: "Follow up meeting scheduled"
 *               lastContact: "2023-08-15T14:30:00Z"
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.get("/items/:itemId", auth, crmController.getItemById);

/**
 * @swagger
 * /api/crm/items/{itemId}:
 *   put:
 *     summary: Update a CRM item
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         example: "607f1f77bcf86cd799439014"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CRMItem'
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.put("/items/:itemId", auth, crmController.updateItem);

/**
 * @swagger
 * /api/crm/items/{itemId}:
 *   delete:
 *     summary: Delete a CRM item (soft delete)
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         example: "607f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Item marked as deleted
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/items/:itemId", auth, crmController.deleteItem);

/**
 * @swagger
 * /api/crm/items/deleted:
 *   get:
 *     summary: Get all deleted CRM items
 *     tags: [CRM]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted CRM items
 *       401:
 *         description: Unauthorized
 */
router.get("/items/deleted", auth, crmController.getDeletedItems);

export default router;