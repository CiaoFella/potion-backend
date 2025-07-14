import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { Accountant, UserAccountantAccess } from "../models/AccountantAccess";

interface AccountantPayload {
    accountantId: string;
}

interface AccountantWithUserPayload extends AccountantPayload {
    userId: string;
    accessLevel: string;
}

// Extended user interface for the request object
interface UserRequestData {
    userId: string;
    id?: string;
    createdBy?: string;
}

declare global {
    namespace Express {
        interface Request {
            accountant?: AccountantPayload;
            accountantWithUser?: AccountantWithUserPayload;
            isAccountant?: boolean;  // Flag to indicate the request is from an accountant
            user?: UserRequestData;
        }
    }
}

// Middleware to authenticate accountants
export const accountantAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        res.status(401).json({ message: "No token, authorization denied" });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as AccountantPayload;

        // Check if accountant exists
        const accountant = await Accountant.findById(decoded.accountantId);

        if (!accountant) {
            res.status(401).json({ message: "Accountant not found" });
            return;
        }

        req.accountant = decoded;

        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

// Middleware to verify accountant's access to a specific user
export const verifyUserAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const accountantId = req.accountant?.accountantId;
    const userId = req.params.userId;

    if (!accountantId || !userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        // Find the access relationship between accountant and user
        const userAccess = await UserAccountantAccess.findOne({
            accountant: accountantId,
            user: userId,
            status: "active"
        });

        if (!userAccess) {
            res.status(403).json({ message: "You don't have access to this user's data" });
            return;
        }

        // Set accountant with user access information
        req.accountantWithUser = {
            accountantId,
            userId,
            accessLevel: userAccess.accessLevel
        };

        // Set user ID for compatibility with existing middleware
        req.user = {
            userId: userId,
            id: userId // Some controllers look for id instead of userId
        };

        // Add createdBy to query parameters for APIs that filter by it
        if (!req.query.createdBy) {
            req.query.createdBy = userId;
        }

        // Block write operations for read-only accountants
        if (userAccess.accessLevel === "read" && isWriteOperation(req.method)) {
            res.status(403).json({ message: "Access denied: Read-only permission. You cannot modify data." });
            return;
        }

        next();
    } catch (error) {
        console.error("Error verifying user access:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Helper function to determine if an operation is a write operation
function isWriteOperation(method: string | undefined): boolean {
    if (!method) return false;
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

// Middleware to check if accountant has edit permissions for a specific user
export const requireEditAccess = (req: Request, res: Response, next: NextFunction): void => {
    if (req.accountantWithUser?.accessLevel !== "edit") {
        res.status(403).json({ message: "Access denied: Read-only permission" });
        return;
    }

    next();
};

// Global authentication middleware that supports both user and accountant tokens
export const globalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    const userIdFromHeader = req.header("X-User-ID"); // For accountants to specify which user they're accessing

    if (!token) {
        res.status(401).json({ message: "No token, authorization denied" });
        return;
    }

    try {
        // Try to decode the token first without assumptions
        const decoded = jwt.verify(token, config.jwtSecret) as any;

        // Determine if this is an accountant token or a user token
        if (decoded.accountantId) {
            // This is an accountant token
            console.log("[Accountant Auth] Accountant token detected:", decoded.accountantId);

            const accountant = await Accountant.findById(decoded.accountantId);
            if (!accountant) {
                res.status(401).json({ message: "Accountant not found" });
                return;
            }

            // Check if a user ID was provided
            const userId = userIdFromHeader;
            if (!userId) {
                res.status(400).json({ message: "X-User-ID header required for accountant access" });
                return;
            }

            console.log("[Accountant Auth] Using user ID from X-User-ID header:", userId);

            // Verify the accountant has access to this user
            const userAccess = await UserAccountantAccess.findOne({
                accountant: decoded.accountantId,
                user: userId,
                status: "active"
            });

            if (!userAccess) {
                res.status(403).json({ message: "You don't have access to this user's data" });
                return;
            }

            // Block write operations for read-only accountants
            if (userAccess.accessLevel === "read" && isWriteOperation(req.method)) {
                res.status(403).json({ message: "Access denied: Read-only permission. You cannot modify data." });
                return;
            }

            // Set up the request with accountant info
            req.accountant = { accountantId: decoded.accountantId };
            req.accountantWithUser = {
                accountantId: decoded.accountantId,
                userId,
                accessLevel: userAccess.accessLevel
            };

            // Set user ID for compatibility with existing middleware
            req.user = {
                userId: userId,
                id: userId,
                createdBy: userId
            };

            // This user ID should now be used directly in controllers via the X-User-ID header
            console.log("[Accountant Auth] Set user object:", req.user);
            req.isAccountant = true;

        } else if (decoded.userId) {
            // This is a regular user token
            console.log("[User Auth] User token detected:", decoded.userId);

            // For regular users, we use their own user ID
            const userId = decoded.userId;

            req.user = {
                userId: userId,
                id: userId,
                createdBy: userId
            };

            console.log("[User Auth] Set user object:", req.user);
            req.isAccountant = false;
        } else {
            // Unknown token type
            res.status(401).json({ message: "Invalid token format" });
            return;
        }

        next();
    } catch (error) {
        res.status(401).json({ message: "Token is not valid" });
    }
}; 