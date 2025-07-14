import { Request, Response } from "express";
import { User } from "../models/User";
import { Accountant, UserAccountantAccess } from "../models/AccountantAccess";
import crypto from "crypto";
import { sendEmail } from "../services/emailService";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/config";

// Invite an accountant
export const inviteAccountant = async (req: Request & { user?: { userId: string } }, res: Response): Promise<any> => {
    try {
        const { email, name, accessLevel } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a unique token for invite
        const inviteToken = crypto.randomBytes(32).toString("hex");
        const inviteTokenExpiry = new Date();
        inviteTokenExpiry.setHours(inviteTokenExpiry.getHours() + 24); // Token valid for 24 hours

        // Check if accountant already exists
        let accountant = await Accountant.findOne({ email });
        let isNewAccountant = !accountant;

        // Send invite email
        const inviteUrl = isNewAccountant ? `${config.frontURL}/auth/accountant/${inviteToken}` : `${config.frontURL}/auth/accountant/login`;

        // If accountant doesn't exist, create one
        if (!accountant) {
            accountant = new Accountant({
                email,
                name,
                userAccesses: []
            });
            isNewAccountant = true;
        }

        // Check if this accountant already has access to this user
        const existingAccess = await UserAccountantAccess.findOne({
            accountant: accountant._id,
            user: userId
        });

        if (existingAccess) {
            return res.status(400).json({ message: "This accountant already has access to your account" });
        }

        // Create the access relationship
        const userAccess = new UserAccountantAccess({
            accountant: accountant._id,
            user: userId,
            accessLevel,
            inviteToken,
            inviteTokenExpiry,
            status: "pending"
        });

        await userAccess.save();

        // Add the access to the accountant's userAccesses array
        accountant.userAccesses.push(userAccess._id);
        await accountant.save();




        await sendEmail({
            to: email,
            subject: "Invitation to Access Financial Records",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Potion Invitation</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            background-color: #f9f9f9;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            padding: 20px;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .logo {
                            text-align: center;
                            margin-bottom: 30px;
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 1px;
                        }
                        .content {
                            text-align: center;
                            padding: 20px;
                            color: #333;
                        }
                        .user-name {
                            font-weight: 500;
                            color: #666;
                        }
                        .message {
                            margin: 20px 0;
                            color: #666;
                            font-size: 15px;
                            line-height: 1.6;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 24px;
                            background-color: #a7f3d0;
                            color: #000;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 500;
                            margin: 20px 0;
                            transition: background-color 0.2s;
                        }
                        .button:hover {
                            background-color: #86efac;
                        }
                        .footer {
                            margin-top: 30px;
                            font-size: 14px;
                            color: #666;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="logo">
                            POTION
                        </div>
                        <div class="content">
                            <div class="user-name">${name}</div>
                            <div class="message">
                                has invited you to access their books as an accountant user through Potion Accountant.
                            </div>
                            <div class="message">
                                As an accounting professional, there's so much more waiting for you in Potion Accountant besides your client's books. As the one place to manage all of your clients and work, Potion Accountant provides you with a suite of tools designed specifically for accountants to help you.
                            </div>
                            <a href="${inviteUrl}" class="button">Accept Invitation</a>
                            <div class="footer">
                                Learn more about the tools and features available to you in Potion Accountant. Ready to get started? Accept your invite to test drive the tools now.
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        res.status(201).json({
            message: "Invitation sent successfully",
            accountant: {
                id: accountant._id,
                email: accountant.email,
                name: accountant.name,
                accessLevel,
                status: "pending",
                createdAt: userAccess.createdAt
            }
        });
    } catch (error) {
        console.error("Error inviting accountant:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Accept invitation and set up accountant account
export const setupAccountantAccount = async (req: Request, res: Response): Promise<any> => {
    try {
        const { token, password } = req.body;

        // Find the user-accountant access relationship with this token
        const userAccess = await UserAccountantAccess.findOne({
            inviteToken: token,
            inviteTokenExpiry: { $gt: new Date() },
            status: "pending"
        }).populate("accountant");

        if (!userAccess) {
            return res.status(400).json({ message: "Invalid or expired invitation token" });
        }

        const accountant = userAccess.accountant as any;

        // Check if accountant already has a password set
        const isNewAccountant = !accountant.password;

        if (isNewAccountant) {
            // Hash the password for new accountant
            const hashedPassword = await bcrypt.hash(password, 10);
            accountant.password = hashedPassword;
            await accountant.save();
        }

        // Update the user-accountant access relationship
        userAccess.status = "active";
        userAccess.inviteToken = undefined;
        userAccess.inviteTokenExpiry = undefined;
        await userAccess.save();

        res.json({ message: isNewAccountant ? "Account setup successfully. You can now log in." : "Invitation accepted successfully." });
    } catch (error) {
        console.error("Error setting up accountant account:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Accountant login
export const accountantLogin = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;

        // Find the accountant
        const accountant = await Accountant.findOne({ email });

        if (!accountant) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, accountant.password || "");
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Update last login
        accountant.lastLogin = new Date();
        await accountant.save();

        // Generate token
        const token = jwt.sign(
            {
                accountantId: accountant._id
            },
            config.jwtSecret!,
            { expiresIn: "1d" }
        );

        // Get all active user accesses for this accountant
        const userAccesses = await UserAccountantAccess.find({
            accountant: accountant._id,
            status: "active"
        }).populate("user");

        const clients = userAccesses.map(access => ({
            accessId: access._id,
            userId: access.user._id,
            name: `${(access.user as any).firstName} ${(access.user as any).lastName}`.trim(),
            accessLevel: access.accessLevel,
            profilePicture: (access.user as any).profilePicture,
            email: (access.user as any).email,
            user: (access.user as any)
        }));

        res.json({
            token,
            accountant: {
                id: accountant._id,
                name: accountant.name,
                email: accountant.email,
                clients
            }
        });
    } catch (error) {
        console.error("Error during accountant login:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get all accountants for a user
export const getAccountants = async (req: Request & { user?: { userId: string } }, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Find all user-accountant access relationships for this user
        const userAccesses = await UserAccountantAccess.find({
            user: userId
        }).populate("accountant");

        res.json(userAccesses.map(access => ({
            id: access._id,
            accountantId: (access.accountant as any)._id,
            email: (access.accountant as any).email,
            name: (access.accountant as any).name,
            accessLevel: access.accessLevel,
            status: access.status,
            createdAt: access.createdAt
        })));
    } catch (error) {
        console.error("Error getting accountants:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update accountant access level
export const updateAccountantAccess = async (req: Request & { user?: { userId: string } }, res: Response): Promise<any> => {
    try {
        const { accessId } = req.params;
        const { accessLevel, name } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const accountant = await Accountant.findById(accessId);
        if (!accountant) {
            return res.status(404).json({ message: "Accountant not found" });
        }
        accountant.name = name;

        const userAccesses = await UserAccountantAccess.find({
            accountant: accountant._id,
            user: userId
        });

        // Use Promise.all to wait for all updates to complete
        await Promise.all(userAccesses.map(async (access) => {
            access.accessLevel = accessLevel;
            await access.save();
        }));
        await accountant.save();

        res.json({ message: "Accountant updated successfully", data: accountant });
    } catch (error) {
        console.error("Error updating accountant access:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Deactivate/reactivate accountant access
export const toggleAccountantStatus = async (req: Request & { user?: { userId: string } }, res: Response): Promise<any> => {
    try {
        const { accessId } = req.params;
        const { status } = req.body; // "active" or "deactivated"
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userAccess = await UserAccountantAccess.findOne({
            _id: accessId,
            user: userId
        }).populate("accountant");

        if (!userAccess) {
            return res.status(404).json({ message: "Accountant access not found" });
        }

        userAccess.status = status;
        await userAccess.save();

        res.json({
            id: userAccess._id,
            accountantId: (userAccess.accountant as any)._id,
            email: (userAccess.accountant as any).email,
            name: (userAccess.accountant as any).name,
            accessLevel: userAccess.accessLevel,
            status: userAccess.status
        });
    } catch (error) {
        console.error("Error toggling accountant status:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Delete accountant access
export const deleteAccountant = async (req: Request & { user?: { userId: string } }, res: Response): Promise<any> => {
    try {
        const { accessId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Find the access relationship
        const userAccess = await UserAccountantAccess.findOne({
            _id: accessId,
            user: userId
        });

        if (!userAccess) {
            return res.status(404).json({ message: "Accountant access not found" });
        }

        // Remove the access from accountant's userAccesses array
        await Accountant.updateOne(
            { _id: userAccess.accountant },
            { $pull: { userAccesses: userAccess._id } }
        );

        // Delete the access relationship
        await UserAccountantAccess.deleteOne({ _id: userAccess._id });

        res.json({ message: "Accountant access deleted successfully" });
    } catch (error) {
        console.error("Error deleting accountant access:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Resend invitation
export const resendInvitation = async (req: Request & { user?: { userId: string } }, res: Response): Promise<any> => {
    try {
        const { accessId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Find the access relationship and user
        const [userAccess, user] = await Promise.all([
            UserAccountantAccess.findOne({
                _id: accessId,
                user: userId,
                status: "pending"
            }).populate("accountant"),
            User.findById(userId)
        ]);

        if (!userAccess) {
            return res.status(404).json({ message: "Pending accountant invitation not found" });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a new token
        const inviteToken = crypto.randomBytes(32).toString("hex");
        const inviteTokenExpiry = new Date();
        inviteTokenExpiry.setHours(inviteTokenExpiry.getHours() + 24); // Token valid for 24 hours

        // Update the accountant record
        userAccess.inviteToken = inviteToken;
        userAccess.inviteTokenExpiry = inviteTokenExpiry;
        await userAccess.save();

        const accountant = userAccess.accountant as any;
        const isNewAccountant = !accountant.password;

        // Send invite email again
        const inviteUrl = `${config.frontURL}/accountant/setup-account/${inviteToken}`;

        await sendEmail({
            to: accountant.email,
            subject: "Invitation to Access Financial Records (Reminder)",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Potion Invitation</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                            line-height: 1.6;
                            margin: 0;
                            padding: 0;
                            background-color: #f9f9f9;
                        }
                        .container {
                            max-width: 600px;
                            margin: 40px auto;
                            padding: 20px;
                            background: white;
                            border-radius: 8px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .logo {
                            text-align: center;
                            margin-bottom: 30px;
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 1px;
                        }
                        .content {
                            text-align: center;
                            padding: 20px;
                            color: #333;
                        }
                        .user-name {
                            font-weight: 500;
                            color: #666;
                        }
                        .message {
                            margin: 20px 0;
                            color: #666;
                            font-size: 15px;
                            line-height: 1.6;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 24px;
                            background-color: #a7f3d0;
                            color: #000;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: 500;
                            margin: 20px 0;
                            transition: background-color 0.2s;
                        }
                        .button:hover {
                            background-color: #86efac;
                        }
                        .footer {
                            margin-top: 30px;
                            font-size: 14px;
                            color: #666;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="logo">
                            POTION
                        </div>
                        <div class="content">
                            <div class="user-name">${accountant.name}</div>
                            <div class="message">
                                has invited you to access their books as an accountant user through Potion Accountant.
                            </div>
                            <div class="message">
                                As an accounting professional, there's so much more waiting for you in Potion Accountant besides your client's books. As the one place to manage all of your clients and work, Potion Accountant provides you with a suite of tools designed specifically for accountants to help you.
                            </div>
                            <a href="${inviteUrl}" class="button">Accept Invitation</a>
                            <div class="footer">
                                Learn more about the tools and features available to you in Potion Accountant. Ready to get started? Accept your invite to test drive the tools now.
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        res.json({ message: "Invitation resent successfully" });
    } catch (error) {
        console.error("Error resending invitation:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get user accounts for an accountant
export const getAccountantClients = async (req: Request & { accountant?: { accountantId: string } }, res: Response): Promise<any> => {
    try {
        const accountantId = req.accountant?.accountantId;

        if (!accountantId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Find all active access relationships for this accountant
        const userAccesses = await UserAccountantAccess.find({
            accountant: accountantId,
            status: "active"
        }).populate("user", "firstName lastName profilePicture email");

        const clients = userAccesses.map(access => ({
            accessId: access._id,
            userId: access.user._id,
            name: `${(access.user as any).firstName} ${(access.user as any).lastName}`.trim(),
            accessLevel: access.accessLevel,
            profilePicture: (access.user as any).profilePicture,
            email: (access.user as any).email,
        }));

        res.json(clients);
    } catch (error) {
        console.error("Error getting accountant clients:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * DOCUMENTATION:
 * 
 * Accountant API Access Guide
 * ===========================
 * 
 * Accountants can access user data using the regular API endpoints with special headers.
 * 
 * Method 1: Using X-User-ID Header
 * --------------------------------
 * Accountants can use their own token with the existing APIs by including the X-User-ID header:
 * 
 * Example Request:
 * ```
 * GET /api/transaction
 * Authorization: Bearer <accountant-token>
 * X-User-ID: 12345
 * ```
 * 
 * This way, accountants can access all the same endpoints that a regular user would use,
 * but the system will validate their permissions for the specified user.
 * 
 * Available Resources:
 * - /api/transaction - User's transactions
 * - /api/invoice - User's invoices
 * - /api/client - User's clients
 * - /api/project - User's projects
 * - /api/contract - User's contracts
 * - /api/analytics - User's analytics
 * - /api/timetracker - User's time tracker data
 * 
 * Permission Handling:
 * - Read-only accountants can only perform GET requests
 * - Edit-access accountants can perform GET, POST, PUT, PATCH, and DELETE operations
 * 
 * Authentication:
 * - All requests must include the accountant's JWT token in the Authorization header
 * - All requests must include the X-User-ID header specifying which user's data to access
 * - The accountant must have active access to the specified user
 * 
 * Process Flow:
 * 1. Accountant logs in using /api/accountant/login
 * 2. Accountant gets list of accessible clients using /api/accountant/clients
 * 3. Accountant accesses a specific client's data using regular APIs with X-User-ID header
 */ 