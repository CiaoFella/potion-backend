import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { User } from '../models/User';
// Legacy imports - using dynamic imports to avoid issues during transition
// import { Accountant, UserAccountantAccess } from '../models/AccountantAccess';
import { Subcontractor } from '../models/Subcontractor';
import { SubcontractorProjectAccess } from '../models/SubcontractorProjectAccess';
import { UserRoles, UserRoleType, AccessLevel } from '../models/UserRoles';

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
    Permission.WRITE_PROJECT_DATA, // Limited to assigned projects
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
        projectAccesses?: Array<{
          projectId: string;
          userId: string;
          accessLevel: 'viewer' | 'contributor';
        }>; // For subcontractors with multi-project access
        subcontractorId?: string; // For subcontractor context
        accountantId?: string; // For accountant context

        // New unified system fields
        email?: string;
        currentRole?: {
          id: string;
          type: UserRoleType;
          accessLevel: AccessLevel;
          businessOwnerId?: string;
          permissions: string[];
        };
        availableRoles?: Array<{
          id: string;
          type: UserRoleType;
          businessOwnerName?: string;
          accessLevel: AccessLevel;
        }>;
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
  // New unified system fields
  roleId?: string; // The specific UserRoles document ID
  email?: string;
}

/**
 * Unified RBAC middleware that handles both old and new systems
 */
export const rbacAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const userIdFromHeader = req.header('X-User-ID'); // For accountants
    const projectIdFromHeader = req.header('X-Project-ID'); // For subcontractors

    if (!token) {
      res.status(401).json({
        message: 'No token, authorization denied',
        code: 'NO_TOKEN',
      });
      return;
    }

    // Decode token to determine authentication type
    const decoded = jwt.verify(token, config.jwtSecret!) as TokenPayload;

    // Check if this is a new unified system token
    if (decoded.roleId && decoded.userId) {
      await handleUnifiedAuth(decoded, req, res);
    } else if (decoded.userId) {
      // Regular user token (legacy)
      await handleUserAuth(decoded.userId, req, res);
    } else if (decoded.accountantId) {
      // Accountant token (legacy)
      await handleAccountantAuth(
        decoded.accountantId,
        userIdFromHeader,
        req,
        res,
      );
    } else if (decoded.subcontractorId) {
      // Subcontractor token (legacy)
      await handleSubcontractorAuth(
        decoded.subcontractorId,
        projectIdFromHeader,
        req,
        res,
      );
    } else if (decoded.adminId) {
      // Admin token (legacy)
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
 * Handle new unified authentication system
 */
async function handleUnifiedAuth(
  decoded: TokenPayload,
  req: Request,
  res: Response,
): Promise<void> {
  // Find the user
  const user = await User.findById(decoded.userId);
  if (!user) {
    res.status(401).json({
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    });
    return;
  }

  // Find the specific role being used
  const currentRole = await UserRoles.findById(decoded.roleId)
    .populate('businessOwner', 'firstName lastName businessName email')
    .select('+password');

  if (!currentRole || currentRole.user.toString() !== decoded.userId) {
    res.status(401).json({
      message: 'Invalid role or insufficient permissions',
      code: 'INVALID_ROLE',
    });
    return;
  }

  // Check if role is active
  if (currentRole.status !== 'active') {
    res.status(403).json({
      message: 'Role is not active',
      code: 'ROLE_INACTIVE',
      status: currentRole.status,
    });
    return;
  }

  // Get all available roles for this user
  const availableRoles = await UserRoles.find({
    user: decoded.userId,
    deleted: false,
    status: { $in: ['invited', 'active'] },
  })
    .populate('businessOwner', 'firstName lastName businessName')
    .select('roleType accessLevel businessOwner');

  // Build permissions array
  const permissions = getUnifiedPermissions(
    currentRole.roleType,
    currentRole.accessLevel,
  );

  // Map role type to legacy UserRole for compatibility
  const legacyRole = mapRoleTypeToLegacy(currentRole.roleType);

  // Set auth context with both old and new fields
  const authData = {
    userId: decoded.userId!,
    role: legacyRole,
    permissions: ROLE_PERMISSIONS[legacyRole],
    accessLevel: (currentRole.accessLevel === AccessLevel.VIEWER
      ? 'read'
      : 'edit') as 'read' | 'edit',

    // New unified system fields
    email: user.email,
    currentRole: {
      id: currentRole._id.toString(),
      type: currentRole.roleType,
      accessLevel: currentRole.accessLevel,
      businessOwnerId: currentRole.businessOwner?._id.toString(),
      permissions,
    },
    availableRoles: availableRoles.map((role) => ({
      id: role._id.toString(),
      type: role.roleType,
      businessOwnerName: role.businessOwner
        ? `${(role.businessOwner as any).firstName} ${(role.businessOwner as any).lastName}`.trim() ||
          (role.businessOwner as any).businessName
        : undefined,
      accessLevel: role.accessLevel,
    })),
  };

  req.auth = authData;

  // Set user context for data filtering
  const targetUserId =
    currentRole.roleType === UserRoleType.BUSINESS_OWNER
      ? decoded.userId!
      : currentRole.businessOwner?._id.toString() || decoded.userId!;

  req.user = {
    userId: targetUserId,
    id: targetUserId,
    createdBy: targetUserId,
  };

  // Update last accessed time
  currentRole.lastAccessed = new Date();
  await currentRole.save();
}

/**
 * Get permissions for unified system
 */
function getUnifiedPermissions(
  roleType: UserRoleType,
  accessLevel: AccessLevel,
): string[] {
  const permissionMatrix = {
    [UserRoleType.BUSINESS_OWNER]: [
      'read',
      'write',
      'delete',
      'manage_team',
      'billing',
      'invite_users',
    ],
    [UserRoleType.ACCOUNTANT]: {
      [AccessLevel.VIEWER]: ['read'],
      [AccessLevel.CONTRIBUTOR]: ['read', 'write'],
      [AccessLevel.EDITOR]: ['read', 'write', 'manage_data'],
      [AccessLevel.ADMIN]: ['read', 'write', 'manage_data', 'manage_team'],
    },
    [UserRoleType.SUBCONTRACTOR]: {
      [AccessLevel.VIEWER]: ['read'],
      [AccessLevel.CONTRIBUTOR]: ['read', 'write', 'manage_tasks'],
      [AccessLevel.EDITOR]: ['read', 'write', 'manage_tasks', 'manage_data'],
      [AccessLevel.ADMIN]: ['read', 'write', 'manage_tasks', 'manage_data'],
    },
    [UserRoleType.ADMIN]: [
      'read',
      'write',
      'delete',
      'manage_team',
      'billing',
      'system_admin',
      'invite_users',
    ],
  };

  const rolePermissions = permissionMatrix[roleType];

  if (Array.isArray(rolePermissions)) {
    return rolePermissions;
  }

  return rolePermissions[accessLevel] || [];
}

/**
 * Map new role types to legacy role enum
 */
function mapRoleTypeToLegacy(roleType: UserRoleType): UserRole {
  const mapping = {
    [UserRoleType.BUSINESS_OWNER]: UserRole.USER,
    [UserRoleType.ACCOUNTANT]: UserRole.ACCOUNTANT,
    [UserRoleType.SUBCONTRACTOR]: UserRole.SUBCONTRACTOR,
    [UserRoleType.ADMIN]: UserRole.ADMIN,
  };

  return mapping[roleType] || UserRole.USER;
}

/**
 * Handle regular user authentication (legacy)
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
 * Handle accountant authentication (legacy) - using dynamic imports
 */
async function handleAccountantAuth(
  accountantId: string,
  userIdFromHeader: string | undefined,
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // Dynamic import to avoid module loading issues during transition
    const { Accountant, UserAccountantAccess } = await import(
      '../models/AccountantAccess'
    );

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

    // Build unified auth fields for compatibility with new system
    const currentBusinessOwner = await User.findById(userIdFromHeader);

    // Get all clients this accountant has access to (for availableRoles)
    const allUserAccess = await UserAccountantAccess.find({
      accountant: accountantId,
      status: 'active',
    }).populate('user', 'firstName lastName businessName email');

    console.log(
      '🔍 [RBAC] Accountant auth - Found user access records:',
      allUserAccess.length,
    );
    console.log(
      '🔍 [RBAC] Accountant auth - User ID from header:',
      userIdFromHeader,
    );
    console.log('🔍 [RBAC] Accountant auth - Accountant ID:', accountantId);

    const availableRoles = allUserAccess.map((access) => {
      const businessOwner = access.user as any;
      const role = {
        id: access._id.toString(), // Use the access ID as role ID for legacy compatibility
        type: UserRoleType.ACCOUNTANT,
        businessOwnerName:
          businessOwner.businessName ||
          `${businessOwner.firstName} ${businessOwner.lastName}`.trim(),
        accessLevel:
          access.accessLevel === 'read'
            ? AccessLevel.VIEWER
            : AccessLevel.CONTRIBUTOR,
      };
      console.log('🔍 [RBAC] Accountant auth - Created role:', role);
      return role;
    });

    const currentRoleAccess = availableRoles.find((role) =>
      allUserAccess.find(
        (access) =>
          access._id.toString() === role.id &&
          access.user._id.toString() === userIdFromHeader,
      ),
    );

    console.log(
      '🔍 [RBAC] Accountant auth - Current role access:',
      currentRoleAccess,
    );
    console.log(
      '🔍 [RBAC] Accountant auth - Available roles count:',
      availableRoles.length,
    );

    const authData = {
      userId: userIdFromHeader,
      role: UserRole.ACCOUNTANT,
      permissions,
      accessLevel: userAccess.accessLevel,
      targetUserId: userIdFromHeader,
      accountantId,

      // New unified system fields for compatibility
      email: accountant.email,
      currentRole: currentRoleAccess
        ? {
            id: currentRoleAccess.id,
            type: UserRoleType.ACCOUNTANT,
            accessLevel: currentRoleAccess.accessLevel,
            businessOwnerId: userIdFromHeader,
            permissions: permissions.map((p) => p.toString()),
          }
        : undefined,
      availableRoles,
    };

    console.log(
      '🔍 [RBAC] Accountant auth - Final auth data:',
      JSON.stringify(authData, null, 2),
    );
    req.auth = authData;

    req.user = {
      userId: userIdFromHeader,
      id: userIdFromHeader,
      createdBy: userIdFromHeader,
    };
  } catch (error) {
    console.error('Legacy accountant auth error:', error);
    res.status(500).json({
      message: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
}

/**
 * Handle subcontractor authentication with multi-project support (legacy)
 */
async function handleSubcontractorAuth(
  subcontractorId: string,
  projectIdFromHeader: string | undefined,
  req: Request,
  res: Response,
): Promise<void> {
  const subcontractor = await Subcontractor.findById(subcontractorId);
  if (!subcontractor) {
    res.status(401).json({ message: 'Subcontractor not found' });
    return;
  }

  // Get all active project accesses for this subcontractor
  const projectAccesses = await SubcontractorProjectAccess.find({
    subcontractor: subcontractorId,
    status: 'active',
  }).populate('project user');

  if (!projectAccesses || projectAccesses.length === 0) {
    res.status(403).json({
      message: 'No active project access found',
      code: 'NO_PROJECT_ACCESS',
    });
    return;
  }

  // If a specific project is requested via header, validate access
  let targetUserId: string;
  let targetProjectId: string;

  if (projectIdFromHeader) {
    const requestedAccess = projectAccesses.find(
      (access) => access.project._id.toString() === projectIdFromHeader,
    );

    if (!requestedAccess) {
      res.status(403).json({
        message: "You don't have access to this project",
        code: 'PROJECT_ACCESS_DENIED',
      });
      return;
    }

    targetUserId = requestedAccess.user._id.toString();
    targetProjectId = projectIdFromHeader;
  } else {
    // If no specific project requested, use the first active project
    const firstAccess = projectAccesses[0];
    targetUserId = firstAccess.user._id.toString();
    targetProjectId = firstAccess.project._id.toString();
  }

  // Build unified auth fields for compatibility with new system
  const availableRoles = projectAccesses.map((access) => {
    const businessOwner = access.user as any;
    return {
      id: access._id.toString(), // Use the access ID as role ID for legacy compatibility
      type: UserRoleType.SUBCONTRACTOR,
      businessOwnerName:
        businessOwner.businessName ||
        `${businessOwner.firstName} ${businessOwner.lastName}`.trim(),
      accessLevel:
        access.accessLevel === 'viewer'
          ? AccessLevel.VIEWER
          : AccessLevel.CONTRIBUTOR,
    };
  });

  const currentRoleAccess = availableRoles.find((role) =>
    projectAccesses.find(
      (access) =>
        access._id.toString() === role.id &&
        access.user._id.toString() === targetUserId,
    ),
  );

  req.auth = {
    userId: targetUserId,
    role: UserRole.SUBCONTRACTOR,
    permissions: ROLE_PERMISSIONS[UserRole.SUBCONTRACTOR],
    subcontractorId,
    projectAccesses: projectAccesses.map((access) => ({
      projectId: access.project._id.toString(),
      userId: access.user._id.toString(),
      accessLevel: access.accessLevel,
    })),

    // New unified system fields for compatibility
    email: subcontractor.email,
    currentRole: currentRoleAccess
      ? {
          id: currentRoleAccess.id,
          type: UserRoleType.SUBCONTRACTOR,
          accessLevel: currentRoleAccess.accessLevel,
          businessOwnerId: targetUserId,
          permissions: ROLE_PERMISSIONS[UserRole.SUBCONTRACTOR].map((p) =>
            p.toString(),
          ),
        }
      : undefined,
    availableRoles,
  };

  // Set user context to the project owner for data filtering
  req.user = {
    userId: targetUserId,
    id: targetUserId,
    createdBy: targetUserId,
  };
}

/**
 * Handle admin authentication (legacy)
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

    // Check if subcontractor has contributor access
    if (req.auth?.role === UserRole.SUBCONTRACTOR) {
      const projectId =
        req.params.projectId || req.body.projectId || req.query.projectId;
      if (projectId) {
        const projectAccess = req.auth.projectAccesses?.find(
          (access) => access.projectId === projectId,
        );

        if (projectAccess && projectAccess.accessLevel === 'viewer') {
          res.status(403).json({
            message:
              'Access denied: Viewer permission. You cannot modify this project.',
            code: 'VIEWER_ONLY_ACCESS',
          });
          return;
        }
      }
    }

    // Check new unified system write permissions
    if (
      req.auth?.currentRole &&
      !req.auth.currentRole.permissions.includes('write')
    ) {
      res.status(403).json({
        message: 'Access denied: Write permission required',
        code: 'WRITE_PERMISSION_DENIED',
        accessLevel: req.auth.currentRole.accessLevel,
      });
      return;
    }
  }

  next();
};

/**
 * Enhanced middleware to ensure subcontractors can only access their assigned projects
 */
export const enforceProjectAccess = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.auth?.role === UserRole.SUBCONTRACTOR) {
    const requestedProjectId =
      req.params.projectId || req.body.projectId || req.query.projectId;

    if (requestedProjectId) {
      const hasAccess = req.auth.projectAccesses?.some(
        (access) => access.projectId === requestedProjectId,
      );

      if (!hasAccess) {
        res.status(403).json({
          message: 'Access denied: You can only access your assigned projects',
          code: 'PROJECT_ACCESS_DENIED',
        });
        return;
      }
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
    projectAccesses: req.auth?.projectAccesses,

    // New unified system fields
    email: req.auth?.email,
    currentRole: req.auth?.currentRole,
    availableRoles: req.auth?.availableRoles,
  };
};

/**
 * Middleware to ensure only business owners can access certain endpoints (unified system)
 */
export const businessOwnerOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Check both old and new systems
  const isLegacyBusinessOwner = req.auth?.role === UserRole.USER;
  const isUnifiedBusinessOwner =
    req.auth?.currentRole?.type === UserRoleType.BUSINESS_OWNER;

  if (!isLegacyBusinessOwner && !isUnifiedBusinessOwner) {
    res.status(403).json({
      message: 'Access denied: Business owner access required',
      code: 'BUSINESS_OWNER_ONLY',
    });
    return;
  }
  next();
};
