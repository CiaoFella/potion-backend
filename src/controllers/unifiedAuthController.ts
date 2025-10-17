import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/config';
import { User } from '../models/User';
import { UserRoles, UserRoleType, AccessLevel } from '../models/UserRoles';
import { sendEmail } from '../services/emailService';

export const generateUnifiedToken = (userId: string, roleId: string, email: string, roleType?: string, businessOwnerId?: string): string => {
  return jwt.sign({ userId, roleId, email, roleType, businessOwnerId }, config.jwtSecret!, { expiresIn: '30d' });
};

const getRoleDisplayName = (roleType: UserRoleType, businessOwner?: any): string => {
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
      `${businessOwner.firstName || ''} ${businessOwner.lastName || ''}`.trim() ||
      businessOwner.email;
    baseName += ` for ${ownerName}`;
  }
  return baseName;
};

const getFullDisplayName = (roleType: UserRoleType, businessOwner: any, user: any): string => {
  if (roleType === UserRoleType.BUSINESS_OWNER) {
    return user.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  }
  const ownerName =
    businessOwner?.businessName ||
    `${businessOwner?.firstName || ''} ${businessOwner?.lastName || ''}`.trim() ||
    businessOwner?.email;
  return ownerName || 'Unknown Business Owner';
};

export const checkAvailableRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.json({ success: true, email, roles: [], multipleRoles: false });
      return;
    }
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
            name: getFullDisplayName(role.roleType, role.businessOwner as any, user),
            email: (role.businessOwner as any).email,
          }
        : null,
      accessLevel: role.accessLevel,
      status: role.status,
      hasPassword: user.isPasswordSet,
      displayName: getFullDisplayName(role.roleType, role.businessOwner as any, user),
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
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unifiedLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, roleId } = req.body;
    if (!email || !password || !roleId) {
      res.status(400).json({ error: 'Email, password, and role ID are required' });
      return;
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +isPasswordSet');
    if (!user || !user.password || !user.isPasswordSet) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const userRole = await UserRoles.findOne({
      _id: roleId,
      user: user._id,
      deleted: false,
      status: { $in: ['invited', 'active'] },
    }).populate('businessOwner', 'firstName lastName businessName email');
    if (!userRole) {
      res.status(401).json({ error: 'Invalid role or access denied' });
      return;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (userRole.status === 'invited') {
      userRole.status = 'active';
      await userRole.save();
    }
    const token = generateUnifiedToken(
      user._id.toString(),
      userRole._id.toString(),
      user.email,
      userRole.roleType,
      (userRole.businessOwner as any)?._id?.toString(),
    );
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
            name: getFullDisplayName(userRole.roleType, userRole.businessOwner as any, user),
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
            name: getFullDisplayName(role.roleType, role.businessOwner as any, user),
            email: (role.businessOwner as any).email,
          }
        : null,
      accessLevel: role.accessLevel,
    }));
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
        userRole: 'user',
        redirectTo: '/dashboard',
      });
    } else {
      res.json({
        success: true,
        token,
        currentRole,
        availableRoles: mappedRoles,
        userRole: userRole.roleType,
        redirectTo: userRole.roleType === UserRoleType.ACCOUNTANT ? '/transactions' : '/projects',
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const switchRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roleId } = req.body;
    const userId = req.auth?.userId;
    if (!roleId || !userId) {
      res.status(400).json({ error: 'Role ID is required' });
      return;
    }
    const targetRole = await UserRoles.findOne({
      _id: roleId,
      user: userId,
      deleted: false,
      status: 'active',
    }).populate('businessOwner', 'firstName lastName businessName email _id');
    if (!targetRole) {
      res.status(404).json({ error: 'Role not found or access denied' });
      return;
    }
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const token = jwt.sign(
      {
        userId,
        roleId: targetRole._id.toString(),
        email: user.email,
        roleType: targetRole.roleType,
        businessOwnerId: targetRole.businessOwner?._id?.toString(),
      },
      config.jwtSecret!,
      { expiresIn: '24h' },
    );
    const currentRole = {
      id: targetRole._id.toString(),
      type: targetRole.roleType,
      name: getRoleDisplayName(targetRole.roleType, targetRole.businessOwner),
      businessOwner: targetRole.businessOwner
        ? {
            id: (targetRole.businessOwner as any)._id,
            name: getFullDisplayName(targetRole.roleType, targetRole.businessOwner as any, user),
            email: (targetRole.businessOwner as any).email,
          }
        : null,
      accessLevel: targetRole.accessLevel,
    };
    const mappedRoles = await UserRoles.find({
      user: userId,
      deleted: false,
      status: { $in: ['invited', 'active'] },
    })
      .populate('businessOwner', 'firstName lastName businessName email')
      .then((roles) =>
        roles.map((role) => ({
          id: role._id.toString(),
          type: role.roleType,
          name: getRoleDisplayName(role.roleType, role.businessOwner),
          businessOwner: role.businessOwner
            ? {
                id: (role.businessOwner as any)._id,
                name: getFullDisplayName(role.roleType, role.businessOwner as any, user),
                email: (role.businessOwner as any).email,
              }
            : null,
          accessLevel: role.accessLevel,
        })),
      );
    res.json({
      success: true,
      token,
      currentRole: { ...currentRole, businessOwnerId: targetRole.businessOwner?._id?.toString() },
      availableRoles: mappedRoles,
      userRole: targetRole.roleType === UserRoleType.BUSINESS_OWNER ? 'user' : targetRole.roleType,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const inviteUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, roleType, accessLevel = AccessLevel.VIEWER, note, name } = req.body;
    const businessOwnerId = req.auth?.userId;
    if (!email || !roleType) {
      res.status(400).json({ error: 'Email and role type are required' });
      return;
    }
    if (!Object.values(UserRoleType).includes(roleType)) {
      res.status(400).json({ error: 'Invalid role type' });
      return;
    }
    if (roleType === UserRoleType.BUSINESS_OWNER || roleType === UserRoleType.ADMIN) {
      res.status(400).json({ error: 'Cannot invite business owners or admins' });
      return;
    }
    let user = await User.findOne({ email: email.toLowerCase() }).select('+password +isPasswordSet');
    if (!user) {
      const parts = typeof name === 'string' ? name.trim().split(/\s+/).filter(Boolean) : [];
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';
      const placeholder = crypto.randomBytes(24).toString('hex');
      const hashed = await bcrypt.hash(placeholder, 12);
      user = new User({
        email: email.toLowerCase(),
        firstName,
        lastName,
        password: hashed,
        authProvider: 'password',
        isPasswordSet: false,
        isActive: false,
      } as any);
      await user.save();
    }
    const existingRole = await UserRoles.findOne({
      user: user._id,
      roleType,
      businessOwner: businessOwnerId,
    });
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (existingRole) {
      if (existingRole.deleted) {
        existingRole.deleted = false;
        existingRole.status = 'invited';
        existingRole.accessLevel = accessLevel;
        existingRole.invitedAt = new Date();
        existingRole.invitedBy = businessOwnerId as any;
        existingRole.inviteToken = inviteToken;
        existingRole.inviteTokenExpiry = inviteTokenExpiry;
        await existingRole.save();
        await existingRole.populate('businessOwner', 'firstName lastName businessName email');
        await sendRoleInvitationEmail(user, existingRole, true);
        res.json({
          success: true,
          message: 'Invitation sent successfully (role reactivated)',
          role: { id: existingRole._id, email: user.email, roleType, accessLevel, status: 'invited' },
        });
        return;
      } else {
        res.status(400).json({ error: 'User already has this role with you', details: `${user.email} is already invited/active as ${roleType}` });
        return;
      }
    }
    const userRole = new UserRoles({
      user: user._id,
      email: user.email,
      roleType,
      businessOwner: businessOwnerId,
      accessLevel,
      status: 'invited',
      inviteToken,
      inviteTokenExpiry,
      invitedBy: businessOwnerId as any,
      invitedAt: new Date(),
      note,
    } as any);
    await userRole.save();
    await userRole.populate('businessOwner', 'firstName lastName businessName email');
    await sendRoleInvitationEmail(user, userRole, true);
    res.json({
      success: true,
      message: 'Invitation sent successfully',
      role: { id: userRole._id, email: user.email, roleType, accessLevel, status: 'invited' },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'User already has this role', details: 'This user already has the specified role with your organization' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTeamMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const businessOwnerId = req.auth?.userId;
    const { roleType } = req.query;
    const query: any = {
      businessOwner: businessOwnerId,
      deleted: false,
      status: { $in: ['invited', 'active'] },
    };
    if (roleType && roleType !== 'all') query.roleType = roleType;
    const teamMembers = await UserRoles.find(query)
      .populate('user', 'firstName lastName email')
      .populate('businessOwner', 'firstName lastName businessName')
      .sort({ createdAt: -1 });
    const formatted = teamMembers.map((role) => {
      const user = role.user as any;
      const bo = role.businessOwner as any;
      return {
        _id: role._id,
        email: role.email || user?.email,
        fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}`.trim() : role.email?.split('@')[0] || 'Unknown',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        roleType: role.roleType,
        status: role.status,
        accessLevel: role.accessLevel,
        invitedAt: role.invitedAt,
        lastAccessed: role.lastAccessed,
        businessOwner: {
          id: bo?._id,
          name: bo?.firstName && bo?.lastName ? `${bo.firstName} ${bo.lastName}`.trim() : bo?.businessName || 'Business Owner',
          email: bo?.email,
        },
        isPasswordSet: true,
        deleted: false,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setupRolePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as any;
    const { password, firstName, lastName } = req.body as any;
    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }
    const userRole = await UserRoles.findOne({
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() },
      deleted: false,
      status: 'invited',
    }).populate('user');
    if (!userRole) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }
    const user = userRole.user as any;
    if (firstName || lastName) {
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.isPasswordSet = true;
    user.isActive = true;
    await user.save();
    userRole.status = 'active';
    userRole.inviteToken = undefined as any;
    userRole.inviteTokenExpiry = undefined as any;
    await userRole.save();
    const authToken = generateUnifiedToken(
      user._id.toString(),
      userRole._id.toString(),
      user.email,
      userRole.roleType,
      (userRole.businessOwner as any)?._id?.toString(),
    );
    res.json({
      success: true,
      message: 'Password set successfully',
      roleType: userRole.roleType,
      token: authToken,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const validatePasswordToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as any;
    const userRole = await UserRoles.findOne({
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() },
      deleted: false,
      status: 'invited',
    }).populate('user businessOwner');
    if (!userRole) {
      res.status(400).json({ valid: false, error: 'Invalid or expired token' });
      return;
    }
    const user = userRole.user as any;
    const businessOwner = userRole.businessOwner as any;
    res.json({
      valid: true,
      user: { email: user.email, firstName: user.firstName, lastName: user.lastName },
      roleType: userRole.roleType,
      businessOwner: businessOwner
        ? { firstName: businessOwner.firstName, lastName: businessOwner.lastName, businessName: businessOwner.businessName }
        : null,
    });
  } catch (error) {
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
};

export const unifiedForgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, roleId } = req.body as any;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    let userRole;
    if (roleId) {
      userRole = await UserRoles.findOne({ _id: roleId, deleted: false }).populate('user businessOwner');
      if (!userRole || (userRole.user as any).email.toLowerCase() !== email.toLowerCase()) {
        res.status(404).json({ error: 'Role not found or email mismatch' });
        return;
      }
    } else {
      const user = await User.findOne({ email: email.toLowerCase() });
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
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    userRole.inviteToken = token;
    userRole.inviteTokenExpiry = expiry;
    userRole.status = 'invited';
    await userRole.save();
    const resetUrl = `${config.frontURL}/setup-password/${token}`;
    await sendEmail({
      to: email,
      subject: `Reset your Potion password`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937;">Hi ${((userRole.user as any).firstName || 'there')}</h1>
          <p>We received a request to reset your password for your Potion ${userRole.roleType} account.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" style="background: #1EC64C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Reset My Password</a>
          </div>
          <p><strong>This link expires in 48 hours</strong>.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });
    res.json({ success: true, message: 'Password reset email sent', roleType: userRole.roleType });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendRoleInvitationEmail = async (user: any, userRole: any, isNew = true): Promise<void> => {
  const businessOwner = await User.findById(userRole.businessOwner).select('firstName lastName businessName email');
  const businessOwnerName = businessOwner
    ? `${businessOwner.firstName || ''} ${businessOwner.lastName || ''}`.trim() || businessOwner.businessName || 'Your Business Partner'
    : 'Your Business Partner';
  const tokenForLink = userRole.inviteToken;
  const setupLink = isNew ? `${config.frontURL}/setup-password/${tokenForLink}` : `${config.frontURL}`;
  let subject = '';
  let htmlContent = '';
  if (userRole.roleType === UserRoleType.ACCOUNTANT && isNew) {
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
  } else if (userRole.roleType === UserRoleType.ACCOUNTANT) {
    subject = `Invitation: Join ${businessOwnerName}'s team as Accountant`;
    htmlContent = `
      <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Hello!</h1>
        <p><strong>${businessOwnerName}</strong> has invited you to join their team as an <strong>Accountant</strong> on Potion.</p>
        <p>You'll have access to their financial data and can help manage their accounting needs.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${setupLink}" style="background: #1EC64C; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Accept Invitation</a>
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
  await sendEmail({ to: user.email, subject, html: htmlContent });
}