import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/User';
import { AccessLevel, UserRoles, UserRoleType } from '../models/UserRoles';
import { sendEmail } from '../services/emailService';
import { sendRoleInvitationEmail } from './unifiedAuthController';

const mapAccess = (value: string): AccessLevel | null => {
  const v = String(value || '').toLowerCase();
  if (v === 'edit') return AccessLevel.EDITOR;
  if (v === 'read') return AccessLevel.VIEWER;
  return null;
};

export const inviteAccountant = async (
  req: Request & { user?: { userId: string } },
  res: Response
): Promise<void> => {
  try {
    const { email, accessLevel, note, name } = req.body;
    const businessOwnerId = req.user?.userId;
    if (!businessOwnerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!email || typeof email !== 'string') {
      res.status(400).json({ message: 'Email is required' });
      return;
    }
    const mapped = mapAccess(accessLevel);
    if (!mapped) {
      res.status(400).json({ message: 'Invalid access level. Use "read" or "edit".' });
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
        authProvider: 'password',
        isActive: false,
        isPasswordSet: false,
        password: hashed,
      } as any);
      await user.save();
    }
    const ownerObjectId = new mongoose.Types.ObjectId(businessOwnerId);
    let role = await UserRoles.findOne({
      user: user._id,
      businessOwner: ownerObjectId,
      roleType: UserRoleType.ACCOUNTANT,
    });
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (role) {
      if (role.status === 'active') {
        res.status(400).json({ message: 'This accountant already has access to your account.' });
        return;
      }
      role.status = 'invited';
      role.accessLevel = mapped;
      role.invitedAt = new Date();
      role.invitedBy = ownerObjectId as any;
      role.inviteToken = inviteToken;
      role.inviteTokenExpiry = inviteTokenExpiry;
      role.deleted = false;
      await role.save();
      await role.populate('businessOwner', 'firstName lastName businessName email');
      await sendRoleInvitationEmail(user, role, !user.isPasswordSet);
      res.status(200).json({
        message: 'Accountant invitation resent.',
        userRole: {
          id: role._id,
          accountant: { id: user._id, email: user.email },
          accessLevel: role.accessLevel,
          status: role.status,
          needsPasswordSetup: !user.isPasswordSet,
        },
      });
      return;
    }
    role = new UserRoles({
      user: user._id,
      email: user.email,
      roleType: UserRoleType.ACCOUNTANT,
      accessLevel: mapped,
      status: 'invited',
      inviteToken,
      inviteTokenExpiry,
      invitedBy: ownerObjectId as any,
      invitedAt: new Date(),
      businessOwner: ownerObjectId,
      note,
    } as any);
    await role.save();
    await role.populate('businessOwner', 'firstName lastName businessName email');
    await sendRoleInvitationEmail(user, role, !user.isPasswordSet);
    res.status(201).json({
      message: 'Accountant invited successfully',
      userRole: {
        id: role._id,
        accountant: { id: user._id, email: user.email },
        accessLevel: role.accessLevel,
        status: role.status,
        needsPasswordSetup: !user.isPasswordSet,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const setupAccountantAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    const role = await UserRoles.findOne({
      inviteToken: token,
      inviteTokenExpiry: { $gt: new Date() },
      roleType: UserRoleType.ACCOUNTANT,
      status: 'invited',
      deleted: false,
    }).populate('user');
    if (!role) {
      res.status(400).json({ message: 'Invalid or expired invitation token' });
      return;
    }
    const user = role.user as any;
    if (password && (!user?.password || !user?.isPasswordSet)) {
      const hashed = await bcrypt.hash(password, 12);
      user.password = hashed;
      user.isPasswordSet = true;
      user.isActive = true;
      await user.save();
    }
    role.status = 'active';
    role.inviteToken = undefined as any;
    role.inviteTokenExpiry = undefined as any;
    await role.save();
    res.json({ message: 'Invitation accepted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAccountants = async (
  req: Request & { user?: { userId: string } },
  res: Response
): Promise<void> => {
  try {
    const businessOwnerId = req.user?.userId;
    if (!businessOwnerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const roles = await UserRoles.find({
      businessOwner: businessOwnerId,
      roleType: UserRoleType.ACCOUNTANT,
      deleted: false,
    }).populate('user', 'firstName lastName email profilePicture');
    res.json(
      roles.map((r) => ({
        id: r._id,
        accountantId: (r.user as any)?._id,
        email: (r.user as any)?.email,
        name: `${(r.user as any)?.firstName || ''} ${(r.user as any)?.lastName || ''}`.trim(),
        accessLevel: r.accessLevel,
        status: r.status,
        createdAt: r.createdAt,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAccountantAccess = async (
  req: Request & { user?: { userId: string } },
  res: Response
): Promise<void> => {
  try {
    const { accessId } = req.params;
    const { accessLevel } = req.body;
    const businessOwnerId = req.user?.userId;
    if (!businessOwnerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const mapped = mapAccess(accessLevel);
    if (!mapped) {
      res.status(400).json({ message: 'Invalid access level. Use "read" or "edit".' });
      return;
    }
    const role = await UserRoles.findOne({ _id: accessId, businessOwner: businessOwnerId, roleType: UserRoleType.ACCOUNTANT });
    if (!role) {
      res.status(404).json({ message: 'Accountant not found' });
      return;
    }
    role.accessLevel = mapped;
    await role.save();
    res.json({ message: 'Accountant updated successfully', data: role });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleAccountantStatus = async (
  req: Request & { user?: { userId: string } },
  res: Response
): Promise<void> => {
  try {
    const { accessId } = req.params;
    const { status } = req.body;
    const businessOwnerId = req.user?.userId;
    if (!businessOwnerId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!['active', 'deactivated'].includes(String(status))) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }
    const role = await UserRoles.findOne({ _id: accessId, businessOwner: businessOwnerId, roleType: UserRoleType.ACCOUNTANT });
    if (!role) {
      res.status(404).json({ message: 'Accountant access not found' });
      return;
    }
    role.status = status;
    await role.save();
    res.json({
      id: role._id,
      accountantId: (role.user as any)?._id,
      email: (role.user as any)?.email,
      name: `${(role.user as any)?.firstName || ''} ${(role.user as any)?.lastName || ''}`.trim(),
      accessLevel: role.accessLevel,
      status: role.status,
    });
  } catch (error: any) {
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
    const role = await UserRoles.findOne({
      _id: accessId,
      businessOwner: businessOwnerId,
      roleType: UserRoleType.ACCOUNTANT,
    }).populate('user', 'firstName lastName email');
    if (!role) {
      res.status(404).json({ message: 'Accountant access not found' });
      return;
    }
    const accountantUser = role.user as any;
    const businessOwner = await User.findById(businessOwnerId);
    await UserRoles.deleteOne({ _id: accessId });
    if (accountantUser && businessOwner) {
      await sendEmail({
        to: accountantUser.email,
        subject: `${businessOwner.firstName || 'Business owner'} has removed your access - Potion Accountant`,
        html: `
          <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; padding: 40px 20px 30px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
              <h1 style="font-size: 28px; font-weight: bold; margin: 0;">POTION</h1>
              <p style="color: #6b7280; margin: 8px 0 0;">Professional Accounting Platform</p>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="font-size: 18px; margin: 0 0 20px;">Hello ${accountantUser.firstName || 'there'},</h2>
              <p><strong>${(businessOwner.firstName || '') + ' ' + (businessOwner.lastName || '') || 'The business owner'}</strong> has removed your access to their books.</p>
              <p>You will no longer be able to access their financial data or reports.</p>
              <p style="color: #6b7280; font-size: 14px;">If you believe this was a mistake, please contact the business owner directly.</p>
            </div>
          </div>
        `,
      });
    }
    res.status(200).json({ message: 'Accountant access removed successfully', roleId: accessId });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resendInvitation = async (
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
    const role = await UserRoles.findOne({
      _id: accessId,
      businessOwner: businessOwnerId,
      roleType: UserRoleType.ACCOUNTANT,
      deleted: false,
    }).populate('user businessOwner');
    if (!role) {
      res.status(404).json({ message: 'Pending accountant invitation not found' });
      return;
    }
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    role.inviteToken = inviteToken;
    role.inviteTokenExpiry = inviteTokenExpiry;
    role.status = 'invited';
    await role.save();
    await sendRoleInvitationEmail(role.user, role, !(role.user as any).isPasswordSet);
    res.json({ message: 'Invitation resent successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAccountantClients = async (
  req: Request & { user?: { userId: string } },
  res: Response
): Promise<void> => {
  try {
    const accountantUserId = req.user?.userId;
    if (!accountantUserId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const roles = await UserRoles.find({
      user: accountantUserId,
      roleType: UserRoleType.ACCOUNTANT,
      status: 'active',
      deleted: false,
    }).populate('businessOwner', 'firstName lastName profilePicture email businessName');
    const clients = roles.map((r) => {
      const bo = r.businessOwner as any;
      return {
        accessId: r._id,
        userId: bo?._id,
        name: bo?.businessName || `${bo?.firstName || ''} ${bo?.lastName || ''}`.trim(),
        accessLevel: r.accessLevel,
        profilePicture: bo?.profilePicture,
        email: bo?.email,
      };
    });
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};