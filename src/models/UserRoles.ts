import mongoose from 'mongoose';
import { myEmitter } from '../services/eventEmitter';

export enum UserRoleType {
  BUSINESS_OWNER = 'business_owner',
  ACCOUNTANT = 'accountant',
  SUBCONTRACTOR = 'subcontractor',
  ADMIN = 'admin',
}

export enum AccessLevel {
  VIEWER = 'viewer',
  CONTRIBUTOR = 'contributor',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

const roleContextSchema = new mongoose.Schema(
  {
    projectIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    clientIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    profile: {
      firstName: { type: String },
      lastName: { type: String },
      phoneNumber: { type: String },
      address: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      businessName: { type: String },
      businessType: { type: String },
      taxId: { type: String },
      profilePicture: { type: String },
      paymentInfo: { type: Object },
      profileUpdatedAt: { type: Date },
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { _id: false },
);

const userRolesSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    roleType: {
      type: String,
      enum: Object.values(UserRoleType),
      required: true,
    },
    businessOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return (
          this.roleType !== UserRoleType.BUSINESS_OWNER &&
          this.roleType !== UserRoleType.ADMIN
        );
      },
    },
    accessLevel: {
      type: String,
      enum: Object.values(AccessLevel),
      default: AccessLevel.CONTRIBUTOR,
    },
    status: {
      type: String,
      enum: ['invited', 'active', 'deactivated'],
      default: 'invited',
    },
    inviteToken: String,
    inviteTokenExpiry: Date,
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    roleContext: roleContextSchema,
    lastLogin: Date,
    lastAccessed: Date,
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userRolesSchema.index({ user: 1, roleType: 1, businessOwner: 1 }, { unique: true });
userRolesSchema.index({ email: 1, roleType: 1, businessOwner: 1 });
userRolesSchema.index({ businessOwner: 1, roleType: 1, status: 1 });
userRolesSchema.index({ inviteToken: 1 });

userRolesSchema.virtual('roleDisplayName').get(function () {
  const roleNames = {
    [UserRoleType.BUSINESS_OWNER]: 'Business Owner',
    [UserRoleType.ACCOUNTANT]: 'Accountant',
    [UserRoleType.SUBCONTRACTOR]: 'Subcontractor',
    [UserRoleType.ADMIN]: 'Admin',
  };
  return roleNames[this.roleType] || this.roleType;
});

userRolesSchema.pre('save', async function (next) {
  if (this.isModified('status') && this.status === 'active') {
    this.lastAccessed = new Date();
  }
  next();
});

userRolesSchema.methods.hasPermission = function (permission: string): boolean {
  const permissions = {
    [UserRoleType.BUSINESS_OWNER]: ['read', 'write', 'delete', 'manage_team', 'billing'],
    [UserRoleType.ACCOUNTANT]: {
      [AccessLevel.VIEWER]: ['read'],
      [AccessLevel.EDITOR]: ['read', 'write'],
      [AccessLevel.ADMIN]: ['read', 'write', 'manage_team'],
    },
    [UserRoleType.SUBCONTRACTOR]: {
      [AccessLevel.VIEWER]: ['read'],
      [AccessLevel.CONTRIBUTOR]: ['read', 'write'],
      [AccessLevel.EDITOR]: ['read', 'write', 'manage_tasks'],
    },
    [UserRoleType.ADMIN]: ['read', 'write', 'delete', 'manage_team', 'billing', 'system_admin'],
  } as any;

  let rolePermissions = permissions[this.roleType];
  if (typeof rolePermissions === 'object' && !Array.isArray(rolePermissions)) {
    rolePermissions = rolePermissions[this.accessLevel] || [];
  }
  return Array.isArray(rolePermissions) && rolePermissions.includes(permission);
};

userRolesSchema.statics.findUserRoles = function (userId: string) {
  return this.find({
    user: userId,
    deleted: false,
    status: { $in: ['invited', 'active'] },
  }).populate('businessOwner', 'firstName lastName businessName email');
};

userRolesSchema.statics.findTeamMembers = function (businessOwnerId: string, roleType?: UserRoleType) {
  const query: any = {
    businessOwner: businessOwnerId,
    deleted: false,
    status: { $in: ['invited', 'active'] },
  };
  if (roleType) {
    query.roleType = roleType;
  }
  return this.find(query).populate('user', 'firstName lastName email profilePicture');
};

userRolesSchema.statics.hasRoleWithBusinessOwner = function (
  userId: string,
  businessOwnerId: string,
  roleType: UserRoleType,
) {
  return this.findOne({
    user: userId,
    businessOwner: businessOwnerId,
    roleType,
    deleted: false,
    status: { $in: ['invited', 'active'] },
  });
};

userRolesSchema.post('save', function (doc) {
  if (this.isNew) {
    myEmitter.emit('userRole:created', {
      userRole: doc,
      roleType: doc.roleType,
      businessOwner: doc.businessOwner,
    });
  } else if (this.isModified('status')) {
    myEmitter.emit('userRole:statusChanged', {
      userRole: doc,
      previousStatus: this.getChanges().$set?.status,
      newStatus: doc.status,
    });
  }
});

export const UserRoles = mongoose.model('UserRoles', userRolesSchema);