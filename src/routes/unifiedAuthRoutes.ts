import express from 'express';
import {
  checkAvailableRoles,
  unifiedLogin,
  switchRole,
  inviteUserRole,
  setupRolePassword,
  validatePasswordToken,
  getTeamMembers,
  unifiedForgotPassword,
  sendRoleInvitationEmail,
} from '../controllers/unifiedAuthController';
import { rbacAuth, businessOwnerOnly } from '../middleware/rbac';
import { UserRoles, AccessLevel } from '../models/UserRoles';
import crypto from 'crypto';

const router = express.Router();

router.post('/check-roles', checkAvailableRoles);
router.post('/login', unifiedLogin);
router.post('/forgot-password', unifiedForgotPassword);
router.post('/setup-password/:token', setupRolePassword);
router.get('/validate-token/:token', validatePasswordToken);

router.use(rbacAuth);

router.post('/switch-role', switchRole);
router.post('/invite', businessOwnerOnly, inviteUserRole);

router.get('/my-roles', (req, res) => {
  const response = {
    currentRole: req.auth?.currentRole,
    availableRoles: req.auth?.availableRoles,
    user: {
      userId: req.auth?.userId,
      email: req.auth?.email,
    },
  };
  res.json(response);
});

router.get('/team', businessOwnerOnly, getTeamMembers);

router.patch('/team/:roleId', businessOwnerOnly, async (req, res): Promise<void> => {
  try {
    const { roleId } = req.params;
    const { accessLevel } = req.body;
    const businessOwnerId = req.auth?.userId;
    if (!Object.values(AccessLevel).includes(accessLevel)) {
      res.status(400).json({ error: 'Invalid access level' });
      return;
    }
    const userRole = await UserRoles.findOne({
      _id: roleId,
      businessOwner: businessOwnerId,
      deleted: false,
    });
    if (!userRole) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    userRole.accessLevel = accessLevel;
    await userRole.save();
    res.json({
      success: true,
      message: 'Access level updated successfully',
      roleId: userRole._id,
      newAccessLevel: accessLevel,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

router.delete('/team/:roleId', businessOwnerOnly, async (req, res): Promise<void> => {
  try {
    const { roleId } = req.params;
    const businessOwnerId = req.auth?.userId;
    const userRole = await UserRoles.findOne({
      _id: roleId,
      businessOwner: businessOwnerId,
      deleted: false,
    });
    if (!userRole) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    userRole.deleted = true;
    userRole.deletedAt = new Date();
    userRole.deletedBy = businessOwnerId as any;
    await userRole.save();
    res.json({ success: true, message: 'Team member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

router.post('/team/:roleId/resend-invite', businessOwnerOnly, async (req, res): Promise<void> => {
  try {
    const { roleId } = req.params;
    const businessOwnerId = req.auth?.userId;
    const userRole = await UserRoles.findOne({
      _id: roleId,
      businessOwner: businessOwnerId,
      deleted: false,
      status: 'invited',
    }).populate('user businessOwner');
    if (!userRole) {
      res.status(404).json({ error: 'Invited team member not found or already active' });
      return;
    }
    const inviteToken = crypto.randomBytes(32).toString('hex');
    userRole.inviteToken = inviteToken;
    userRole.inviteTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await userRole.save();
    await sendRoleInvitationEmail(userRole.user, userRole, !(userRole.user as any).isPasswordSet);
    res.json({ success: true, message: 'Invitation resent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

export default router;