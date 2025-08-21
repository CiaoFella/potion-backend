import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/config';
import { User } from '../models/User';
import { UserRoles, UserRoleType, AccessLevel } from '../models/UserRoles';
import { sendEmail } from '../services/emailService';
import crypto from 'crypto';

/**
 * Generate unified JWT token
 */
export const generateUnifiedToken = (
  userId: string,
  roleId: string,
  email: string,
): string => {
  return jwt.sign(
    {
      userId,
      roleId,
      email,
    },
    config.jwtSecret!,
    { expiresIn: '30d' },
  );
};

/**
 * Get role display name for UI
 */
const getRoleDisplayName = (
  roleType: UserRoleType,
  businessOwner?: any,
): string => {
  const roleNames = {
    [UserRoleType.BUSINESS_OWNER]: 'Business Owner',
    [UserRoleType.ACCOUNTANT]: 'Accountant',
    [UserRoleType.SUBCONTRACTOR]: 'Subcontractor',
    [UserRoleType.ADMIN]: 'Admin',
  };

  let baseName = roleNames[roleType];

  if (businessOwner && roleType !== UserRoleType.BUSINESS_OWNER) {
    const ownerName =
      businessOwner.businessName ||
      `${businessOwner.firstName} ${businessOwner.lastName}`.trim() ||
      businessOwner.email;
    baseName += ` for ${ownerName}`;
  }

  return baseName;
};

/**
 * Get full display name for role
 */
const getFullDisplayName = (
  roleType: UserRoleType,
  businessOwner: any,
  user: any,
): string => {
  if (roleType === UserRoleType.BUSINESS_OWNER) {
    return (
      user.businessName ||
      `${user.firstName} ${user.lastName}`.trim() ||
      user.email
    );
  }

  const ownerName =
    businessOwner?.businessName ||
    `${businessOwner?.firstName} ${businessOwner?.lastName}`.trim() ||
    businessOwner?.email;

  return ownerName || 'Unknown Business Owner';
};

/**
 * Check available roles for an email address
 */
export const checkAvailableRoles = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.json({
        success: true,
        email,
        roles: [],
        multipleRoles: false,
      });
      return;
    }

    // Find all roles for this user
    const roles = await UserRoles.find({
      user: user._id,
      deleted: false,
      status: { $in: ['invited', 'active'] },
    }).populate('businessOwner', 'firstName lastName businessName email');

    const availableRoles = roles.map((role) => ({
      id: role._id.toString(),
      type: role.roleType,
      name: getRoleDisplayName(role.roleType, role.businessOwner),
      email: role.email,
      businessOwner: role.businessOwner
        ? {
            id: (role.businessOwner as any)._id,
            name: getFullDisplayName(
              role.roleType,
              role.businessOwner as any,
              user,
            ),
            email: (role.businessOwner as any).email,
          }
        : null,
      accessLevel: role.accessLevel,
      status: role.status,
      hasPassword: role.isPasswordSet,
      displayName: getFullDisplayName(
        role.roleType,
        role.businessOwner as any,
        user,
      ),
    }));

    res.json({
      success: true,
      email,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      roles: availableRoles,
      multipleRoles: availableRoles.length > 1,
    });
  } catch (error) {
    console.error('Check available roles error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
};

/**
 * Unified login with role selection
 */
export const unifiedLogin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, password, roleId } = req.body;

    if (!email || !password || !roleId) {
      res.status(400).json({
        error: 'Email, password, and role ID are required',
      });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Find the specific role
    const userRole = await UserRoles.findOne({
      _id: roleId,
      user: user._id,
      deleted: false,
      status: { $in: ['invited', 'active'] },
    })
      .populate('businessOwner', 'firstName lastName businessName email')
      .select('+password');

    if (!userRole) {
      res.status(401).json({ error: 'Invalid role or access denied' });
      return;
    }

    // Check if password is set
    if (!userRole.password || !userRole.isPasswordSet) {
      res.status(401).json({
        error:
          'Password not set for this role. Please check your email for setup instructions.',
        passwordNotSet: true,
        roleType: userRole.roleType,
      });
      return;
    }

    // Verify password
    const isPasswordValid = await (userRole as any).comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Update status to active if it was invited
    if (userRole.status === 'invited') {
      userRole.status = 'active';
      await userRole.save();
    }

    // Generate token
    const token = generateUnifiedToken(
      user._id.toString(),
      userRole._id.toString(),
      user.email,
    );

    // Get all available roles for this user
    const availableRoles = await UserRoles.find({
      user: user._id,
      deleted: false,
      status: { $in: ['invited', 'active'] },
    }).populate('businessOwner', 'firstName lastName businessName email');

    const currentRole = {
      id: userRole._id.toString(),
      type: userRole.roleType,
      name: getRoleDisplayName(userRole.roleType, userRole.businessOwner),
      businessOwner: userRole.businessOwner
        ? {
            id: (userRole.businessOwner as any)._id,
            name: getFullDisplayName(
              userRole.roleType,
              userRole.businessOwner as any,
              user,
            ),
            email: (userRole.businessOwner as any).email,
          }
        : null,
      accessLevel: userRole.accessLevel,
    };

    const mappedRoles = availableRoles.map((role) => ({
      id: role._id.toString(),
      type: role.roleType,
      name: getRoleDisplayName(role.roleType, role.businessOwner),
      businessOwner: role.businessOwner
        ? {
            id: (role.businessOwner as any)._id,
            name: getFullDisplayName(
              role.roleType,
              role.businessOwner as any,
              user,
            ),
            email: (role.businessOwner as any).email,
          }
        : null,
      accessLevel: role.accessLevel,
    }));

    // Response based on role type
    if (userRole.roleType === UserRoleType.BUSINESS_OWNER) {
      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          businessName: user.businessName,
        },
        currentRole,
        availableRoles: mappedRoles,
        userRole: 'user', // Legacy compatibility
        redirectTo: '/dashboard',
      });
    } else {
      // External user (accountant/subcontractor)
      res.json({
        success: true,
        token,
        currentRole,
        availableRoles: mappedRoles,
        userRole: userRole.roleType, // accountant or subcontractor
        redirectTo:
          userRole.roleType === UserRoleType.ACCOUNTANT
            ? '/transactions'
            : '/projects',
      });
    }
  } catch (error) {
    console.error('Unified login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Switch role without re-authentication
 */
export const switchRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { roleId } = req.body;
    const userId = req.auth?.userId;

    if (!roleId || !userId) {
      res.status(400).json({ error: 'Role ID is required' });
      return;
    }

    // Find the target role and populate businessOwner
    const targetRole = await UserRoles.findOne({
      _id: roleId,
      user: userId,
      deleted: false,
      status: 'active',
    }).populate('businessOwner', 'firstName lastName businessName email _id');


    console.log("----------------------------------", targetRole)

    if (!targetRole) {
      res.status(404).json({ error: 'Role not found or access denied' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate new token with all necessary information
    const token = jwt.sign(
      {
        userId,
        roleId: targetRole._id.toString(),
        email: user.email,
        roleType: targetRole.roleType,
        // Include businessOwnerId for accountant access
        businessOwnerId: targetRole.businessOwner?._id?.toString(),
      },
      config.jwtSecret!,
      { expiresIn: '24h' }
    );

    // Map currentRole and availableRoles for response
    const currentRole = {
      id: targetRole._id.toString(),
      type: targetRole.roleType,
      name: getRoleDisplayName(targetRole.roleType, targetRole.businessOwner),
      businessOwner: targetRole.businessOwner
        ? {
            id: (targetRole.businessOwner as any)._id,
            name: getFullDisplayName(
              targetRole.roleType,
              targetRole.businessOwner as any,
              user,
            ),
            email: (targetRole.businessOwner as any).email,
          }
        : null,
      accessLevel: targetRole.accessLevel,
    };

    const mappedRoles = await UserRoles.find({
      user: userId,
      deleted: false,
      status: { $in: ['invited', 'active'] },
    }).populate('businessOwner', 'firstName lastName businessName email').then(roles =>
      roles.map((role) => ({
        id: role._id.toString(),
        type: role.roleType,
        name: getRoleDisplayName(role.roleType, role.businessOwner),
        businessOwner: role.businessOwner
          ? {
              id: (role.businessOwner as any)._id,
              name: getFullDisplayName(
                role.roleType,
                role.businessOwner as any,
                user,
              ),
              email: (role.businessOwner as any).email,
            }
          : null,
        accessLevel: role.accessLevel,
      }))
    );

    // Add businessOwnerId to response for frontend use
    res.json({
      success: true,
      token,
      currentRole: {
        ...currentRole,
        // Add businessOwnerId for X-User-ID header
        businessOwnerId: targetRole.businessOwner?._id?.toString(),
      },
      availableRoles: mappedRoles,
      userRole: targetRole.roleType === UserRoleType.BUSINESS_OWNER
        ? 'user'
        : targetRole.roleType,
    });
  } catch (error) {
    console.error('Switch role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Invite user to a specific role (business owners only)
 */
export const inviteUserRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      email,
      roleType,
      accessLevel = AccessLevel.CONTRIBUTOR,
      subcontractorData,
    } = req.body;
    const businessOwnerId = req.auth?.userId;

    if (!email || !roleType) {
      res.status(400).json({ error: 'Email and role type are required' });
      return;
    }

    if (!Object.values(UserRoleType).includes(roleType)) {
      res.status(400).json({ error: 'Invalid role type' });
      return;
    }

    if (
      roleType === UserRoleType.BUSINESS_OWNER ||
      roleType === UserRoleType.ADMIN
    ) {
      res
        .status(400)
        .json({ error: 'Cannot invite business owners or admins' });
      return;
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Create new user with subcontractor data if provided
      const userData: any = {
        email: email.toLowerCase(),
        firstName: subcontractorData?.fullName?.split(' ')[0] || '',
        lastName:
          subcontractorData?.fullName?.split(' ').slice(1).join(' ') || '',
        password: 'temp_password_' + Date.now(), // Temporary password
        authProvider: 'password',
        isPasswordSet: false,
      };

      // Add subcontractor-specific data if this is a subcontractor invitation
      if (roleType === UserRoleType.SUBCONTRACTOR && subcontractorData) {
        userData.businessName = subcontractorData.businessName;
        userData.country = subcontractorData.country;
        userData.businessType = subcontractorData.taxType;
        userData.taxId = subcontractorData.taxId;

        // Store payment information
        if (subcontractorData.paymentInformation) {
          const paymentInfo = subcontractorData.paymentInformation;
          const paymentMethods = [];

          if (paymentInfo.paymentType === 'bank') {
            paymentMethods.push({
              id: Date.now().toString(),
              type: 'bank',
              accountName: paymentInfo.accountHolderName,
              accountNumber: paymentInfo.accountNumber
                ? `****${paymentInfo.accountNumber.slice(-4)}`
                : '',
              routingNumber: paymentInfo.routingNumber || paymentInfo.swiftCode,
              isDefault: true,
            });
          } else if (paymentInfo.paymentType === 'paypal') {
            // For PayPal, we might store it differently
            userData.paypalEmail = paymentInfo.paypalEmail;
          }

          if (paymentMethods.length > 0) {
            userData.paymentMethods = paymentMethods;
          }
        }
      }

      user = new User(userData);
      await user.save();
    } else if (roleType === UserRoleType.SUBCONTRACTOR && subcontractorData) {
      // Update existing user with subcontractor data if not already set
      let shouldUpdate = false;

      if (!user.firstName && subcontractorData.fullName) {
        user.firstName = subcontractorData.fullName.split(' ')[0] || '';
        user.lastName =
          subcontractorData.fullName.split(' ').slice(1).join(' ') || '';
        shouldUpdate = true;
      }

      if (!user.businessName && subcontractorData.businessName) {
        user.businessName = subcontractorData.businessName;
        shouldUpdate = true;
      }

      if (!user.country && subcontractorData.country) {
        user.country = subcontractorData.country;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await user.save();
      }
    }

    // Check if role already exists (including deleted ones)
    const existingRole = await UserRoles.findOne({
      user: user._id,
      roleType,
      businessOwner: businessOwnerId,
    });

    if (existingRole) {
      if (existingRole.deleted) {
        // Reactivate the deleted role instead of creating a new one
        existingRole.deleted = false;
        existingRole.status = 'invited';
        existingRole.accessLevel = accessLevel;
        existingRole.invitedAt = new Date();
        existingRole.invitedBy = businessOwnerId as any;

        // Generate new tokens
        const inviteToken = jwt.sign(
          { userId: user._id, businessOwnerId, roleType },
          config.jwtSecret!,
          { expiresIn: '7d' },
        );
        const passwordSetupToken = jwt.sign(
          { userId: user._id, roleType, setup: true },
          config.jwtSecret!,
          { expiresIn: '7d' },
        );

        existingRole.inviteToken = inviteToken;
        existingRole.inviteTokenExpiry = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        existingRole.passwordSetupToken = passwordSetupToken;
        existingRole.passwordSetupTokenExpiry = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );

        await existingRole.save();

        // Populate businessOwner for email template
        await existingRole.populate(
          'businessOwner',
          'firstName lastName businessName email',
        );

        // Send invitation email
        await sendRoleInvitationEmail(user, existingRole);

        res.json({
          success: true,
          message: 'Invitation sent successfully (role reactivated)',
          role: {
            id: existingRole._id,
            email: user.email,
            roleType,
            accessLevel,
            status: 'invited',
          },
        });
        return;
      } else {
        // Active role already exists
        res.status(400).json({
          error: 'User already has this role with you',
          details: `${user.email} is already invited/active as ${roleType}`,
        });
        return;
      }
    }

    // Generate tokens
    const inviteToken = jwt.sign(
      { userId: user._id, businessOwnerId, roleType },
      config.jwtSecret!,
      { expiresIn: '7d' },
    );

    const passwordSetupToken = jwt.sign(
      { userId: user._id, roleType, setup: true },
      config.jwtSecret!,
      { expiresIn: '7d' },
    );

    // Create role
    const userRole = new UserRoles({
      user: user._id,
      email: user.email,
      roleType,
      businessOwner: businessOwnerId,
      accessLevel,
      status: 'invited',
      inviteToken,
      inviteTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      passwordSetupToken,
      passwordSetupTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedBy: businessOwnerId as any,
      invitedAt: new Date(),
    });

    await userRole.save();

    // Populate businessOwner for email template
    await userRole.populate(
      'businessOwner',
      'firstName lastName businessName email',
    );

    // Send invitation email
    await sendRoleInvitationEmail(user, userRole);

    res.json({
      success: true,
      message: 'Invitation sent successfully',
      role: {
        id: userRole._id,
        email: user.email,
        roleType,
        accessLevel,
        status: 'invited',
      },
    });
  } catch (error) {
    console.error('Invite user role error:', error);

    // Handle specific MongoDB duplicate key error
    if (error.code === 11000) {
      res.status(400).json({
        error: 'User already has this role',
        details:
          'This user already has the specified role with your organization',
      });
      return;
    }

    res.status(500).json({
      error: 'Internal server error',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get team members for a business owner
 */
export const getTeamMembers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const businessOwnerId = req.auth?.userId;
    const { roleType } = req.query;

    let query: any = {
      businessOwner: businessOwnerId,
      deleted: false,
      status: { $in: ['invited', 'active'] },
    };

    // Filter by role type if specified
    if (roleType && roleType !== 'all') {
      query.roleType = roleType;
    }

    const teamMembers = await UserRoles.find(query)
      .populate('user', 'firstName lastName email')
      .populate('businessOwner', 'firstName lastName businessName')
      .sort({ createdAt: -1 });

    const formattedMembers = teamMembers.map((role) => {
      const user = role.user as any;
      const businessOwner = role.businessOwner as any;

      return {
        _id: role._id,
        email: role.email || user?.email,
        fullName:
          user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`.trim()
            : role.email?.split('@')[0] || 'Unknown',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        roleType: role.roleType,
        status: role.status,
        accessLevel: role.accessLevel,
        invitedAt: role.invitedAt,
        lastAccessed: role.lastAccessed,
        businessOwner: {
          id: businessOwner?._id,
          name:
            businessOwner?.firstName && businessOwner?.lastName
              ? `${businessOwner.firstName} ${businessOwner.lastName}`.trim()
              : businessOwner?.businessName || 'Business Owner',
          email: businessOwner?.email,
        },
        // For backward compatibility
        isPasswordSet: role.status === 'active',
        deleted: false,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
    });

    res.json(formattedMembers);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Set up password for a role (supports both unified and legacy systems)
 */
export const setupRolePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.params;
    const { password, firstName, lastName } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    // First, try to find token in the new unified UserRoles system
    let userRole = await UserRoles.findOne({
      passwordSetupToken: token,
      passwordSetupTokenExpiry: { $gt: new Date() },
      deleted: false,
    }).populate('user');

    if (userRole) {
      // Handle unified system token
      const user = userRole.user as any;

      // Update user info if provided
      if (firstName || lastName) {
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        await user.save();
      }

      // Set password for role
      userRole.password = password; // Will be hashed by pre-save hook
      userRole.isPasswordSet = true;
      userRole.status = 'active';
      userRole.passwordSetupToken = undefined;
      userRole.passwordSetupTokenExpiry = undefined;

      await userRole.save();

      // Generate unified auth token
      const authToken = generateUnifiedToken(
        user._id.toString(),
        userRole._id.toString(),
        user.email,
      );

      res.json({
        success: true,
        message: 'Password set successfully',
        roleType: userRole.roleType,
        token: authToken,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
      return;
    }

    // If not found in unified system, check legacy User model
    const user = await User.findOne({
      passwordSetupToken: token,
      passwordSetupTokenExpiry: { $gt: new Date() },
    });

    if (user) {
      // Handle legacy system token (regular user password reset)

      // Update user info if provided
      if (firstName || lastName) {
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
      }

      // Hash password and update user
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update user with proper typing
      await User.findByIdAndUpdate(user._id, {
        password: hashedPassword,
        isPasswordSet: true,
        $unset: {
          passwordSetupToken: 1,
          passwordSetupTokenExpiry: 1,
        },
      });

      // Create or update business owner role
      let businessOwnerRole = await UserRoles.findOne({
        user: user._id,
        roleType: UserRoleType.BUSINESS_OWNER,
        deleted: false,
      });

      if (!businessOwnerRole) {
        // Create business owner role
        businessOwnerRole = new UserRoles({
          user: user._id,
          email: user.email,
          roleType: UserRoleType.BUSINESS_OWNER,
          accessLevel: AccessLevel.ADMIN,
          status: 'active',
          password: hashedPassword,
          isPasswordSet: true,
        });
        await businessOwnerRole.save();
      } else {
        // Update existing role with password
        await UserRoles.findByIdAndUpdate(businessOwnerRole._id, {
          password: hashedPassword,
          isPasswordSet: true,
          status: 'active',
        });
        // Refresh the document
        businessOwnerRole = await UserRoles.findById(businessOwnerRole._id);
      }

      // Generate unified auth token using the business owner role
      const authToken = generateUnifiedToken(
        user._id.toString(),
        businessOwnerRole!._id.toString(),
        user.email,
      );

      res.json({
        success: true,
        message: 'Password set successfully',
        roleType: 'business_owner',
        token: authToken,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      });
      return;
    }

    // Token not found in either system
    res.status(400).json({ error: 'Invalid or expired token' });
  } catch (error) {
    console.error('Setup role password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Validate password setup token (supports both unified and legacy systems)
 */
export const validatePasswordToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { token } = req.params;

    // First, try to find token in the new unified UserRoles system
    let userRole = await UserRoles.findOne({
      passwordSetupToken: token,
      passwordSetupTokenExpiry: { $gt: new Date() },
      deleted: false,
    }).populate('user businessOwner');

    if (userRole) {
      // Found in unified system
      const user = userRole.user as any;
      const businessOwner = userRole.businessOwner as any;

      res.json({
        valid: true,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        roleType: userRole.roleType,
        businessOwner: businessOwner
          ? {
              firstName: businessOwner.firstName,
              lastName: businessOwner.lastName,
              businessName: businessOwner.businessName,
            }
          : null,
      });
      return;
    }

    // If not found in unified system, check legacy User model (for password resets from old system)
    const user = await User.findOne({
      passwordSetupToken: token,
      passwordSetupTokenExpiry: { $gt: new Date() },
    });

    if (user) {
      // Found in legacy system - this is a regular user password reset
      res.json({
        valid: true,
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        roleType: 'business_owner', // Legacy users are business owners
        businessOwner: null,
      });
      return;
    }

    // Token not found in either system
    res.status(400).json({
      valid: false,
      error: 'Invalid or expired token',
    });
  } catch (error) {
    console.error('Validate password token error:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Unified password reset for role-based system
 */
export const unifiedForgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, roleId } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    let userRole;

    if (roleId) {
      // Reset password for specific role
      userRole = await UserRoles.findOne({
        _id: roleId,
        deleted: false,
      }).populate('user businessOwner');

      if (!userRole || (userRole.user as any).email !== email) {
        res.status(404).json({ error: 'Role not found or email mismatch' });
        return;
      }
    } else {
      // Find any active role for this email
      const user = await User.findOne({ email });
      if (!user) {
        res.status(404).json({ error: 'No account found with this email' });
        return;
      }

      userRole = await UserRoles.findOne({
        user: user._id,
        deleted: false,
        status: { $in: ['invited', 'active'] },
      }).populate('user businessOwner');

      if (!userRole) {
        res.status(404).json({ error: 'No active roles found for this email' });
        return;
      }
    }

    // Generate password reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Save token to UserRoles
    userRole.passwordSetupToken = token;
    userRole.passwordSetupTokenExpiry = expiry;
    await userRole.save();

    // Send password reset email
    const user = userRole.user as any;
    const businessOwner = userRole.businessOwner as any;

    // Send password reset email using existing email service
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/setup-password/${token}`;

    await sendEmail({
      to: email,
      subject: `Reset your Potion password`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937;">Hi ${user.firstName || 'there'},</h1>
          <p>We received a request to reset your password for your Potion ${userRole.roleType} account.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" style="background: #1EC64C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Reset My Password</a>
          </div>
          <p><strong>This link expires in 48 hours</strong> - please reset your password soon to avoid having to request a new link.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't request this password reset, you can safely ignore this email. Your account remains secure.</p>
        </div>
      `,
    });

    console.log(
      `Unified password reset sent to ${email} for role ${userRole.roleType}`,
    );

    res.json({
      success: true,
      message: 'Password reset email sent',
      roleType: userRole.roleType,
    });
  } catch (error) {
    console.error('Unified forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Send role invitation email
 */
export const sendRoleInvitationEmail = async (
  user: any,
  userRole: any,
): Promise<void> => {
  try {
    // Get business owner info
    const businessOwner = await User.findById(
      userRole.businessOwner,
    ).select('firstName lastName businessName email');
    const businessOwnerName = businessOwner
      ? `${businessOwner.firstName} ${businessOwner.lastName}`.trim() ||
        businessOwner.businessName ||
        'Your Business Partner'
      : 'Your Business Partner';

    const setupLink = `${config.frontURL}/setup-password/${userRole.inviteToken}`;

    let subject = '';
    let htmlContent = '';

    if (userRole?.accountant) {
      subject = `Invitation: Join ${businessOwnerName}'s team as Accountant`;
      htmlContent = `
        <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Hello!</h1>
          <p><strong>${businessOwnerName}</strong> has invited you to join their team as an <strong>Accountant</strong> on Potion.</p>
          <p>You'll have access to their financial data and can help manage their accounting needs.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupLink}" style="background: #1EC64C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Accept Invitation & Set Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days. If you have any questions, contact ${businessOwnerName} directly.</p>
        </div>
      `;
    } else if (userRole.roleType === UserRoleType.SUBCONTRACTOR) {
      subject = `Project Invitation: Join ${businessOwnerName}'s team`;
      htmlContent = `
        <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Hello!</h1>
          <p><strong>${businessOwnerName}</strong> has invited you to join their project as a <strong>Subcontractor</strong> on Potion.</p>
          <p>You'll be able to collaborate on projects, track your time, and manage your work seamlessly.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupLink}" style="background: #1EC64C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Accept Invitation & Set Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days. Welcome to the team!</p>
        </div>
      `;
    } else {
      subject = `Invitation: Join ${businessOwnerName}'s team`;
      htmlContent = `
        <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Hello!</h1>
          <p><strong>${businessOwnerName}</strong> has invited you to join their team on Potion.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupLink}" style="background: #1EC64C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Accept Invitation & Set Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        </div>
      `;
    }

    await sendEmail({
      to: user.email,
      subject,
      html: htmlContent,
    });

    console.log(
      `✅ Role invitation email sent to ${user.email} for ${userRole.roleType} role`,
    );
  } catch (error) {
    console.error('❌ Error sending role invitation email:', error);
    throw error;
  }
};
