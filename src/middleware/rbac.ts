import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { User } from '../models/User';
import { Accountant, UserAccountantAccess } from '../models/AccountantAccess';
import { Subcontractor } from '../models/Subcontractor';

// Define all user types and their capabilities
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  ACCOUNTANT = 'accountant',
  SUBCONTRACTOR = 'subcontractor',
}

export enum Permission {
  // User data permissions
  READ_OWN_DATA = 'read_own_data',
  WRITE_OWN_DATA = 'write_own_data',

  // Client data permissions (for accountants)
  READ_CLIENT_DATA = 'read_client_data',
  WRITE_CLIENT_DATA = 'write_client_data',

  // Project data permissions (for subcontractors)
  READ_PROJECT_DATA = 'read_project_data',
  WRITE_PROJECT_DATA = 'write_project_data',

  // Admin permissions
  MANAGE_USERS = 'manage_users',
  SYSTEM_ADMIN = 'system_admin',
}

// Permission matrix - what each role can do
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [Permission.READ_OWN_DATA, Permission.WRITE_OWN_DATA],
  [UserRole.ACCOUNTANT]: [
    Permission.READ_CLIENT_DATA,
    Permission.WRITE_CLIENT_DATA, // Can be limited based on access level
  ],
  [UserRole.SUBCONTRACTOR]: [
    Permission.READ_PROJECT_DATA,
    Permission.WRITE_PROJECT_DATA, // Limited to assigned project
  ],
  [UserRole.ADMIN]: [
    Permission.MANAGE_USERS,
    Permission.SYSTEM_ADMIN,
    Permission.READ_OWN_DATA,
    Permission.WRITE_OWN_DATA,
  ],
};

// Extended request interface for RBAC
declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: UserRole;
        permissions: Permission[];
        accessLevel?: 'read' | 'edit'; // For accountants
        targetUserId?: string; // For accountants accessing client data
        projectId?: string; // For subcontractors
        subcontractorId?: string; // For subcontractor context
        accountantId?: string; // For accountant context
      };
      user?: {
        userId: string;
        id?: string;
        createdBy?: string;
      };
    }
  }
}

interface TokenPayload {
  userId?: string;
  accountantId?: string;
  subcontractorId?: string;
  adminId?: string;
}

/**
 * Unified RBAC middleware that handles all user types
 */
export const rbacAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const userIdFromHeader = req.header('X-User-ID'); // For accountants

    if (!token) {
      res.status(401).json({
        message: 'No token, authorization denied',
        code: 'NO_TOKEN',
      });
      return;
    }

    // Decode token to determine user type
    const decoded = jwt.verify(token, config.jwtSecret!) as TokenPayload;

    if (decoded.userId) {
      // Regular user token
      await handleUserAuth(decoded.userId, req, res);
    } else if (decoded.accountantId) {
      // Accountant token
      await handleAccountantAuth(
        decoded.accountantId,
        userIdFromHeader,
        req,
        res,
      );
    } else if (decoded.subcontractorId) {
      // Subcontractor token
      await handleSubcontractorAuth(decoded.subcontractorId, req, res);
    } else if (decoded.adminId) {
      // Admin token
      await handleAdminAuth(decoded.adminId, req, res);
    } else {
      res.status(401).json({
        message: 'Invalid token format',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('RBAC Auth Error:', error);
    res.status(401).json({
      message: 'Token is not valid',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Handle regular user authentication
 */
async function handleUserAuth(
  userId: string,
  req: Request,
  res: Response,
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    res.status(401).json({ message: 'User not found' });
    return;
  }

  req.auth = {
    userId,
    role: UserRole.USER,
    permissions: ROLE_PERMISSIONS[UserRole.USER],
  };

  req.user = {
    userId,
    id: userId,
    createdBy: userId,
  };
}

/**
 * Handle accountant authentication
 */
async function handleAccountantAuth(
  accountantId: string,
  userIdFromHeader: string | undefined,
  req: Request,
  res: Response,
): Promise<void> {
  const accountant = await Accountant.findById(accountantId);
  if (!accountant) {
    res.status(401).json({ message: 'Accountant not found' });
    return;
  }

  if (!userIdFromHeader) {
    res.status(400).json({
      message: 'X-User-ID header required for accountant access',
      code: 'MISSING_USER_ID_HEADER',
    });
    return;
  }

  // Verify accountant has access to the specified user
  const userAccess = await UserAccountantAccess.findOne({
    accountant: accountantId,
    user: userIdFromHeader,
    status: 'active',
  });

  if (!userAccess) {
    res.status(403).json({
      message: "You don't have access to this user's data",
      code: 'ACCESS_DENIED',
    });
    return;
  }

  // Set permissions based on access level
  const permissions =
    userAccess.accessLevel === 'read'
      ? [Permission.READ_CLIENT_DATA]
      : [Permission.READ_CLIENT_DATA, Permission.WRITE_CLIENT_DATA];

  req.auth = {
    userId: userIdFromHeader,
    role: UserRole.ACCOUNTANT,
    permissions,
    accessLevel: userAccess.accessLevel,
    targetUserId: userIdFromHeader,
    accountantId,
  };

  req.user = {
    userId: userIdFromHeader,
    id: userIdFromHeader,
    createdBy: userIdFromHeader,
  };
}

/**
 * Handle subcontractor authentication
 */
async function handleSubcontractorAuth(
  subcontractorId: string,
  req: Request,
  res: Response,
): Promise<void> {
  const subcontractor = await Subcontractor.findById(subcontractorId)
    .populate('project')
    .populate('createdBy');

  if (!subcontractor) {
    res.status(401).json({ message: 'Subcontractor not found' });
    return;
  }

  const projectId = (subcontractor.project as any)?._id?.toString();
  const createdByUserId = (subcontractor.createdBy as any)?._id?.toString();

  req.auth = {
    userId: createdByUserId, // Owner of the project
    role: UserRole.SUBCONTRACTOR,
    permissions: ROLE_PERMISSIONS[UserRole.SUBCONTRACTOR],
    projectId,
    subcontractorId,
  };

  // For subcontractors, they can only access data related to their specific project
  // Set the user context to the project owner for data filtering
  req.user = {
    userId: createdByUserId,
    id: createdByUserId,
    createdBy: createdByUserId,
  };
}

/**
 * Handle admin authentication
 */
async function handleAdminAuth(
  adminId: string,
  req: Request,
  res: Response,
): Promise<void> {
  // Add admin model check if needed
  req.auth = {
    userId: adminId,
    role: UserRole.ADMIN,
    permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
  };

  req.user = {
    userId: adminId,
    id: adminId,
  };
}

/**
 * Middleware factory to check specific permissions
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.permissions.includes(permission)) {
      res.status(403).json({
        message: `Access denied: ${permission} permission required`,
        code: 'PERMISSION_DENIED',
        required: permission,
      });
      return;
    }
    next();
  };
};

/**
 * Middleware factory to check specific roles
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      res.status(403).json({
        message: `Access denied: One of these roles required: ${roles.join(', ')}`,
        code: 'ROLE_DENIED',
        required: roles,
      });
      return;
    }
    next();
  };
};

/**
 * Middleware to check write operations for read-only users
 */
export const checkWritePermission = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const method = req.method.toUpperCase();
  const writeOperations = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (writeOperations.includes(method)) {
    // Check if accountant has write access
    if (
      req.auth?.role === UserRole.ACCOUNTANT &&
      req.auth.accessLevel === 'read'
    ) {
      res.status(403).json({
        message: 'Access denied: Read-only permission. You cannot modify data.',
        code: 'READ_ONLY_ACCESS',
      });
      return;
    }
  }

  next();
};

/**
 * Middleware to ensure subcontractors can only access their assigned project
 */
export const enforceProjectAccess = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.auth?.role === UserRole.SUBCONTRACTOR) {
    const requestedProjectId =
      req.params.projectId || req.body.projectId || req.query.projectId;

    if (requestedProjectId && requestedProjectId !== req.auth.projectId) {
      res.status(403).json({
        message: 'Access denied: You can only access your assigned project',
        code: 'PROJECT_ACCESS_DENIED',
      });
      return;
    }
  }

  next();
};

/**
 * Get user info for the current authenticated request
 */
export const getCurrentUser = (req: Request) => {
  return {
    userId: req.auth?.userId,
    role: req.auth?.role,
    permissions: req.auth?.permissions,
    accessLevel: req.auth?.accessLevel,
  };
};
