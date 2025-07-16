import express from "express";
import { Client } from "../models/Client";
import { Contract } from "../models/Contract";
import { Invoice } from "../models/Invoice";
import { Project } from "../models/Project";
import { auth } from "../middleware/auth";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: general search potion
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search across multiple collections
 *     tags: [Search]
 *     description: Perform a general search across Clients, Contracts, Invoices, and Projects.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: query
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword to find matching records.
 *     responses:
 *       200:
 *         description: A list of search results
 *         content:
 *           application/json:
 *             schema:
 *               itemType: string
 *               type: array
 *               items:
 *                 oneOf:
 *                   - $ref: "#/components/schemas/Client"
 *                   - $ref: "#/components/schemas/Contract"
 *                   - $ref: "#/components/schemas/Invoice"
 *       "400":
 *         description: Invalid request due to missing or malformed query parameter.
 *       "401":
 *         description: Unauthorized - missing or invalid token.
 *       "500":
 *         description: Internal server error.
 */
router.get("/", auth, async (req: any, res: any) => {
  try {
    const query: string = req.query.query as string;
    const userId = req.user?.userId;

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    console.log(userId);

    const searchRegex = new RegExp(query, "i");

    // Searching across collections with user ownership filtering
    const [clients, contracts, invoices, projects] = await Promise.all([
      Client.find({
        deleted: false,
        createdBy: userId, // Ensuring only user-owned data is retrieved
        $or: [
          { name: searchRegex },
          { companyName: searchRegex },
          { address: searchRegex },
          { state: searchRegex },
          { "contacts.name": searchRegex },
          { "contacts.email": searchRegex },
        ],
      }).lean(),

      Contract.find({
        deleted: false,
        createdBy: userId,
        $or: [
          { documentName: searchRegex },
          { type: searchRegex },
          { contractEmail: searchRegex },
          { "party.name": searchRegex },
          { "party.address": searchRegex },
          { rawText: searchRegex }, // Searching inside contract details
        ],
      }).lean(),

      Invoice.find({
        deleted: false,
        createdBy: userId,
        $or: [
          { invoiceNumber: searchRegex },
          { currency: searchRegex },
          { "items.name": searchRegex },
          { rawText: searchRegex }, // Searching invoice details
        ],
      }).lean(),

      Project.find({
        deleted: false,
        createdBy: userId,
        $or: [{ name: searchRegex }, { description: searchRegex }],
      }).lean(),
    ]);

    const results = [
      ...clients.map((c) => ({ itemType: "Client", ...c })),
      ...contracts.map((c) => ({ itemType: "Contract", ...c })),
      ...invoices.map((i) => ({ itemType: "Invoice", ...i })),
      ...projects.map((p) => ({ itemType: "Project", ...p })),
    ];

    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
