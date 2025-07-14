import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { activityTracker } from "./tracker";
import { globalAuthMiddleware } from "./accountantAuth";

interface UserPayload {
  userId: string;
}

// We now just redeclare the user object directly, not through interface extension
// This allows compatibility with the declarations in accountantAuth.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        id?: string;
        createdBy?: string;
      };
    }
  }
}

// The original auth middleware, kept for backward compatibility
export const auth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ message: "No token, authorization denied" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as UserPayload;
    // Set both userId and id for maximum compatibility
    req.user = {
      userId: decoded.userId,
      id: decoded.userId
    };
    activityTracker(req, res, next)
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Global auth that supports both user and accountant tokens
export const unifiedAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  await globalAuthMiddleware(req, res, (err) => {
    if (err) return next(err);
    activityTracker(req, res, next);
  });
};
