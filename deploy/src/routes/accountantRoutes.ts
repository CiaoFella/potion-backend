import { Router } from "express";
import {
    inviteAccountant,
    setupAccountantAccount,
    accountantLogin,
    getAccountants,
    updateAccountantAccess,
    toggleAccountantStatus,
    deleteAccountant,
    resendInvitation,
    getAccountantClients
} from "../controllers/accountantController";
import { auth } from "../middleware/auth";
import { accountantAuth } from "../middleware/accountantAuth";

const router = Router();

/**
 * @swagger
 * /api/accountant/invite:
 *   post:
 *     summary: Invite an accountant to access user's financial records
 *     tags: [Accountant]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - accessLevel
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               accessLevel:
 *                 type: string
 *                 enum: [read, edit]
 *     responses:
 *       201:
 *         description: Accountant invited successfully
 *       400:
 *         description: Invalid input or accountant already exists
 *       401:
 *         description: Unauthorized
 */
router.post("/invite", auth, inviteAccountant);

/**
 * @swagger
 * /api/accountant:
 *   get:
 *     summary: Get all accountants for the authenticated user
 *     tags: [Accountant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all accountants
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, getAccountants);

/**
 * @swagger
 * /api/accountant/{accessId}/access:
 *   put:
 *     summary: Update accountant's access level
 *     tags: [Accountant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accessId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessLevel
 *             properties:
 *               accessLevel:
 *                 type: string
 *                 enum: [read, edit]
 *     responses:
 *       200:
 *         description: Accountant access level updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Accountant access not found
 */
router.put("/:accessId/access", auth, updateAccountantAccess);

/**
 * @swagger
 * /api/accountant/{accessId}/status:
 *   put:
 *     summary: Toggle accountant's status (activate/deactivate)
 *     tags: [Accountant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accessId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, deactivated]
 *     responses:
 *       200:
 *         description: Accountant status updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Accountant not found
 */
router.put("/:accessId/status", auth, toggleAccountantStatus);

/**
 * @swagger
 * /api/accountant/{accessId}:
 *   delete:
 *     summary: Delete an accountant access
 *     tags: [Accountant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Accountant access deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Accountant access not found
 */
router.delete("/:accessId", auth, deleteAccountant);

/**
 * @swagger
 * /api/accountant/{accessId}/resend-invitation:
 *   post:
 *     summary: Resend invitation email to accountant
 *     tags: [Accountant]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accessId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Pending accountant invitation not found
 */
router.post("/:accessId/resend-invitation", auth, resendInvitation);

/**
 * @swagger
 * /api/accountant/setup-account:
 *   post:
 *     summary: Setup accountant account with password
 *     tags: [Accountant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Account setup successfully
 *       400:
 *         description: Invalid or expired invitation token
 */
router.post("/setup-account", setupAccountantAccount);

/**
 * @swagger
 * /api/accountant/login:
 *   post:
 *     summary: Accountant login
 *     tags: [Accountant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       400:
 *         description: Invalid credentials
 */
router.post("/login", accountantLogin);

/**
 * @swagger
 * /api/accountant/clients:
 *   get:
 *     summary: Get all clients (users) the accountant has access to
 *     tags: [Accountant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all accessible clients
 *       401:
 *         description: Unauthorized
 */
router.get("/clients", accountantAuth, getAccountantClients);

export default router; 