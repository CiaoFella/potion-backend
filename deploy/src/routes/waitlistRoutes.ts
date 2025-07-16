import express, { Request, Response } from "express";
import Airtable from "airtable";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Configure Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID || ""
);

// Define interface for request body
interface WaitlistEntry {
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * @swagger
 * tags:
 *   name: Waitlist
 *   description: Endpoints for managing waitlist registrations
 */

/**
 * @swagger
 * /api/waitlist:
 *   post:
 *     summary: Add a user to the waitlist
 *     tags: [Waitlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *     responses:
 *       201:
 *         description: Successfully added to waitlist
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post("/", async (req: any, res: any) => {
  try {
    const { firstName, lastName, email }: WaitlistEntry = req.body;

    // Basic validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Create record in Airtable
    const record = await base("Table 1").create([
      {
        fields: {
          "First Name": firstName,
          "Last Name": lastName,
          Email: email,
          "Date Joined": new Date().toISOString(),
        },
      },
    ]);

    res.status(201).json({
      message: "Successfully added to waitlist",
      id: record[0].id, // Ensure only the ID is returned
    });
  } catch (error) {
    console.error("Waitlist registration error:", error);
    res.status(500).json({ error: "Failed to register for waitlist" });
  }
});

export default router;
