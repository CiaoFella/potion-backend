// Global type declarations for Express Request extensions
// This consolidates all Request interface extensions from various middleware files

declare global {
  namespace Express {
    interface Request {
      // From auth.ts middleware
      user?: {
        userId: string;
        id?: string;
        createdBy?: string;
      };

      // From rbac.ts middleware
      auth?: {
        userId: string;
        role: any;
        permissions: any[];
        accessLevel?: 'read' | 'edit';
        targetUserId?: string;
        projectAccesses?: Array<{
          projectId: string;
          userId: string;
          accessLevel: 'viewer' | 'contributor';
        }>;
        subcontractorId?: string;
        accountantId?: string;
        email?: string;
        currentRole?: {
          id: string;
          type: any;
          accessLevel: any;
          businessOwnerId?: string;
          permissions: string[];
        };
        availableRoles?: Array<{
          id: string;
          type: any;
          accessLevel: any;
          businessOwnerId?: string;
          permissions: string[];
        }>;
      };
    }
  }
}

export {};
