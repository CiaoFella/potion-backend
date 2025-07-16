import express from "express";
import { projectController } from "../controllers/projectController";
import { auth } from "../middleware/auth";
import { validateProject } from "../middleware/validators";
import { uploadF } from "../middleware/upload";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management endpoints
 */

/**
 * @swagger
 * /api/project/trash:
 *   get:
 *     summary: Get deleted projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of deleted projects retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/trash", auth, projectController.getDeletedProject);

/**
 * @swagger
 * /api/project/{projectId}:
 *   post:
 *     summary: Update a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       404:
 *         description: Project not found
 */
router.post("/:projectId", auth, projectController.updateProject);

/**
 * @swagger
 * /api/project:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *               $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Invalid request data
 */
router.post("/", auth, validateProject, projectController.createProject);

/**
 * @swagger
 * /api/project/duplicate/{projectId}:
 *   get:
 *     summary: Duplicate a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID
 *     responses:
 *       201:
 *         description: Project duplicated successfully
 *       404:
 *         description: Project not found
 */
router.get("/duplicate/:projectId", auth, projectController.duplicateProject);

/**
 * @swagger
 * /api/project/{projectId}:
 *   get:
 *     summary: Get a project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
router.get("/:projectId", auth, projectController.getProjectsByID);

/**
 * @swagger
 * /api/project:
 *   get:
 *     summary: Get all projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 */
router.get("/", auth, projectController.getProjects);

/**
 * @swagger
 * /api/project/{projectId}:
 *   delete:
 *     summary: Delete a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The project ID
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       404:
 *         description: Project not found
 */
router.delete("/:projectId", auth, projectController.deleteProject);

router.put("/file/:projectId", uploadF, auth, projectController.updateFile);
router.delete("/file/:projectId/:fileId", auth, projectController.deleteFile);

export default router;
