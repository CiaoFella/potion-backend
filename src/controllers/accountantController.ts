import { Request, Response } from 'express';
import { User } from '../models/User';
import { Accountant, UserAccountantAccess } from '../models/AccountantAccess';
import crypto from 'crypto';
import { sendEmail } from '../services/emailService';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AccessLevel, UserRoles, UserRoleType } from '../models/UserRoles';
import { sendRoleInvitationEmail } from './unifiedAuthController';
import mongoose from 'mongoose';
import { access } from 'fs';

function generateInviteToken(userId: string, businessOwnerId: string) {
  return require('jsonwebtoken').sign(
    { userId, businessOwnerId, roleType: UserRoleType.ACCOUNTANT, setup: true },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
}

enum roleTranslation {
  "edit" = AccessLevel.CONTRIBUTOR,
  "read" = AccessLevel.VIEWER
}

export const inviteAccountant = async (
  req: Request & { user?: { userId: string } },
  res: Response
): Promise<void> => {
  try {
    const { email, accessLevel, note } = req.body;
    const businessOwnerId = req.user?.userId;

    if (!businessOwnerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const existingAccountantRole = await UserRoles.findOne({
      email: email.toLowerCase(),
      roleType: UserRoleType.ACCOUNTANT,
      status: 'active',
      isPasswordSet: true
    });

    let accountantUser = await User.findOne({ email: email.toLowerCase() });
    
    if (!accountantUser) {
      const tempPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      accountantUser = new User({
        email: email.toLowerCase(),
        isActive: false,
        firstName: req.body.name.split(' ')[0] || '',
        lastName: req.body.name.split(' ')[1] || '',
        password: hashedPassword,
        authProvider: 'password',
        isPasswordSet: false,
        roleType: UserRoleType.ACCOUNTANT
      });
      await accountantUser.save();
    }

    const inviteToken = generateInviteToken(accountantUser._id.toString(), businessOwnerId);

    let userRole = await UserRoles.findOne({
      user: accountantUser._id,
      businessOwner: businessOwnerId,
      roleType: UserRoleType.ACCOUNTANT
    });

    if (userRole?.status === 'active') {
      res.status(400).json({ message: 'This accountant already has access to your account' });
      return;
    }

    if (!userRole) {
      userRole = new UserRoles({
        user: accountantUser._id,
        email: accountantUser.email,
        roleType: UserRoleType.ACCOUNTANT,
        accessLevel: roleTranslation[accessLevel],
        status: 'invited',
        inviteToken,
        inviteTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: businessOwnerId,
        invitedAt: new Date(),
        businessOwner: businessOwnerId,
        note,
        password: existingAccountantRole?.password,
        isPasswordSet: existingAccountantRole?.password ? true : false
      });
    } else {
      userRole.status = 'invited';
      userRole.accessLevel = roleTranslation[accessLevel];
      userRole.inviteToken = inviteToken;
      userRole.inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      (userRole as any).note = note;
      userRole.password = existingAccountantRole?.password;
      userRole.isPasswordSet = existingAccountantRole?.password ? true : false;
    }

    await userRole.save();
    await sendRoleInvitationEmail(accountantUser, userRole, !existingAccountantRole);

    res.status(201).json({
      message: 'Accountant invited successfully',
      userRole: {
        id: userRole._id,
        accountant: {
          id: accountantUser._id,
          email: accountantUser.email,
        },
        accessLevel: userRole.accessLevel,
        status: userRole.status,
        needsPasswordSetup: !existingAccountantRole
      },
    });

  } catch (error) {
    console.error('[inviteAccountant] Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept invitation and set up accountant account
export const setupAccountantAccount = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { token, password } = req.body;

    // Find the user-accountant access relationship with this token
    const userAccess = await UserAccountantAccess.findOne({
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() },
      status: 'pending',
    }).populate('accountant');

    if (!userAccess) {
      return res
        .status(400)
        .json({ message: 'Invalid or expired invitation token' });
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
    userAccess.status = 'active';
    userAccess.inviteToken = undefined;
    userAccess.inviteTokenExpiry = undefined;
    await userAccess.save();

    // Send login ready email for new accountants
    if (isNewAccountant) {
      // Get all active clients for this accountant
      const userAccesses = await UserAccountantAccess.find({
        accountant: accountant._id,
        status: 'active',
      }).populate('user');

      const clientNames = userAccesses.map((access) =>
        `${(access.user as any).firstName} ${(access.user as any).lastName}`.trim(),
      );

      await sendEmail({
        to: accountant.email,
        subject: 'Your Potion accountant access is ready - You can now login!',
        html: `
                <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Hi ${accountant.name.split(' ')[0] || accountant.name},</h1>
                    <p><strong>Great news!</strong> Your accountant access has been set up successfully.</p>
                    <p>Your Potion account is now ready! You can login and access your client's financial data and reports anytime.</p>
                    ${clientNames.length > 0
            ? `<p><strong>You have access to ${clientNames.length} client${clientNames.length > 1 ? 's' : ''}:</strong>
                    ${clientNames.slice(0, 3).join(', ')}${clientNames.length > 3 ? ` and ${clientNames.length - 3} more` : ''}</p>`
            : ''
          }
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${config.frontURL}/login" style="background: #1EC64C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Your Dashboard</a>
                    </div>
                    <p style="font-size: 14px; color: #666;">Need help? Just reply to this email - our support team is here to assist you.</p>
                </div>
            `,
      });
    }

    res.json({
      message: isNewAccountant
        ? 'Account setup successfully. You can now log in.'
        : 'Invitation accepted successfully.',
    });
  } catch (error) {
    console.error('Error setting up accountant account:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accountant login
export const accountantLogin = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { email, password } = req.body;

    // Find the accountant
    const accountant = await Accountant.findOne({ email });

    if (!accountant) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, accountant.password || '');
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    accountant.lastLogin = new Date();
    await accountant.save();

    // Generate token
    const token = jwt.sign(
      {
        accountantId: accountant._id,
      },
      config.jwtSecret!,
      { expiresIn: '1d' },
    );

    // Get all active user accesses for this accountant
    const userAccesses = await UserAccountantAccess.find({
      accountant: accountant._id,
      status: 'active',
    }).populate('user');

    const clients = userAccesses.map((access) => ({
      accessId: access._id,
      userId: access.user._id,
      name: `${(access.user as any).firstName} ${(access.user as any).lastName}`.trim(),
      accessLevel: access.accessLevel,
      profilePicture: (access.user as any).profilePicture,
      email: (access.user as any).email,
      user: access.user as any,
    }));

    res.json({
      token,
      accountant: {
        id: accountant._id,
        name: accountant.name,
        email: accountant.email,
        clients,
      },
    });
  } catch (error) {
    console.error('Error during accountant login:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all accountants for a user
export const getAccountants = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find all user-accountant access relationships for this user
    const userAccesses = await UserRoles.find({
      businessOwner: userId,
    }).populate('user', 'firstName lastName email');

    res.json(
      userAccesses.map((access) => ({
        id: access._id,
        accountantId: (access as any)._id,
        email: (access as any).user.email,
        name: (access as any).user.firstName + ' ' + (access as any).user.lastName,
        accessLevel: access.accessLevel,
        status: access.status,
        createdAt: access.createdAt,
      })),
    );
  } catch (error) {
    console.error('Error getting accountants:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update accountant access level
export const updateAccountantAccess = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<any> => {
  try {
    const { accessId } = req.params;
    const { accessLevel, name } = req.body;
      const userId = req.user?.userId;

      console.log('[updateAccountantAccess] Received data:', {
        accessId,
        accessLevel,
        name,
        userId,
      });

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userRole = (await UserRoles.findOne({ _id: accessId, businessOwner: userId }).populate('user', '_id firstName lastName email'));
    if (!userRole) {
      return res.status(404).json({ message: 'Accountant not found' });
    }

    userRole.accessLevel = roleTranslation[accessLevel];
    userRole.save()
    res.json({ message: 'Accountant updated successfully', data: userRole });
  } catch (error) {
    console.error('Error updating accountant access:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Deactivate/reactivate accountant access
export const toggleAccountantStatus = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<any> => {
  try {
    const { accessId } = req.params;
    const { status } = req.body; // "active" or "deactivated"
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userAccess = await UserAccountantAccess.findOne({
      _id: accessId,
      user: userId,
    }).populate('accountant');

    if (!userAccess) {
      return res.status(404).json({ message: 'Accountant access not found' });
    }

    userAccess.status = status;
    await userAccess.save();

    res.json({
      id: userAccess._id,
      accountantId: (userAccess.accountant as any)._id,
      email: (userAccess.accountant as any).email,
      name: (userAccess.accountant as any).name,
      accessLevel: userAccess.accessLevel,
      status: userAccess.status,
    });
  } catch (error) {
    console.error('Error toggling accountant status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAccountant = async (
  req: Request & { user?: { userId: string } },
  res: Response
): Promise<void> => {
  try {
    const { accessId } = req.params;
    const businessOwnerId = req.user?.userId;

    if (!businessOwnerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Find the UserRole with populated user information
    const userRole = await UserRoles.findOne({
      _id: accessId,
      businessOwner: businessOwnerId,
      roleType: UserRoleType.ACCOUNTANT
    }).populate('user', 'firstName lastName email');

    if (!userRole) {
      res.status(404).json({ message: 'Accountant access not found' });
      return;
    }

    // Get user details for email before deletion
    const accountantUser = userRole.user;
    const businessOwner = await User.findById(businessOwnerId);

    // Delete the UserRole completely
    await UserRoles.deleteOne({ _id: accessId });

    if (accountantUser && businessOwner) {
      // Send removal notification email
      await sendEmail({
        to: (accountantUser as any).email,
        subject: `${businessOwner.firstName || 'Business owner'} has removed your access - Potion Accountant`,
        html: `
          <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 40px 20px 30px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
              <h1 style="font-size: 28px; font-weight: bold; margin: 0;">POTION</h1>
              <p style="color: #6b7280; margin: 8px 0 0;">Professional Accounting Platform</p>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="font-size: 18px; margin: 0 0 20px;">Hello ${(accountantUser as any).firstName || 'there'},</h2>
              <p><strong>${businessOwner.firstName + ' ' + businessOwner.lastName || 'The business owner'}</strong> has removed your access to their books.</p>
              <p>You will no longer be able to access their financial data or reports.</p>
              <p style="color: #6b7280; font-size: 14px;">If you believe this was a mistake, please contact the business owner directly.</p>
            </div>
          </div>
        `
      });
    }

    res.status(200).json({ 
      message: 'Accountant access removed successfully',
      roleId: accessId
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend invitation
export const resendInvitation = async (
  req: Request & { user?: { userId: string } },
  res: Response,
): Promise<any> => {
  try {
    const { accessId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find the access relationship and user
    const [userAccess, user] = await Promise.all([
      UserAccountantAccess.findOne({
        _id: accessId,
        user: userId,
        status: 'pending',
      }).populate('accountant'),
      User.findById(userId),
    ]);

    if (!userAccess) {
      return res
        .status(404)
        .json({ message: 'Pending accountant invitation not found' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date();
    inviteTokenExpiry.setHours(inviteTokenExpiry.getHours() + 24); // Token valid for 24 hours

    // Update the accountant record
    userAccess.inviteToken = inviteToken;
    userAccess.inviteTokenExpiry = inviteTokenExpiry;
    await userAccess.save();

    const accountant = userAccess.accountant as any;
    const isNewAccountant = !accountant.password;

    // Send invite email again
    const inviteUrl = `${config.frontURL}/setup-password/${inviteToken}`;

    await sendEmail({
      to: accountant.email,
      subject: 'Your Potion accountant access is ready - You can now login!',
      html: `
                <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1>Hi ${accountant.name.split(' ')[0] || accountant.name},</h1>
                    <p><strong>Great news!</strong> Your accountant access has been set up successfully.</p>
                    <p>Your Potion account is now ready! You can login and access your client's financial data and reports anytime.</p>
                    ${isNewAccountant
          ? `<p><strong>You have access to ${isNewAccountant ? '1' : '0'} client${isNewAccountant ? 's' : ''}:</strong>
                    ${isNewAccountant ? `${user.firstName} ${user.lastName}` : ''}</p>`
          : ''
        }
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${inviteUrl}" style="background: #1EC64C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Your Dashboard</a>
                    </div>
                    <p style="font-size: 14px; color: #666;">Need help? Just reply to this email - our support team is here to assist you.</p>
                </div>
            `,
    });

    res.json({ message: 'Invitation resent successfully' });
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user accounts for an accountant
export const getAccountantClients = async (
  req: Request & { accountant?: { accountantId: string } },
  res: Response,
): Promise<any> => {
  try {
    const accountantId = req.accountant?.accountantId;

    if (!accountantId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find all active access relationships for this accountant
    const userAccesses = await UserAccountantAccess.find({
      accountant: accountantId,
      status: 'active',
    }).populate('user', 'firstName lastName profilePicture email');

    const clients = userAccesses.map((access) => ({
      accessId: access._id,
      userId: access.user._id,
      name: `${(access.user as any).firstName} ${(access.user as any).lastName}`.trim(),
      accessLevel: access.accessLevel,
      profilePicture: (access.user as any).profilePicture,
      email: (access.user as any).email,
    }));

    res.json(clients);
  } catch (error) {
    console.error('Error getting accountant clients:', error);
    res.status(500).json({ message: 'Server error' });
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
