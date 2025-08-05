import { Request, Response } from 'express';
import { UserRoles, UserRoleType } from '../models/UserRoles';
import { User } from '../models/User';

// TypeScript interface for role profile
interface RoleProfile {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  businessName?: string;
  businessType?: string;
  taxId?: string;
  profilePicture?: string;
  paymentInfo?: Record<string, any>;
}

export interface PaymentMethod {
  id: string;
  type: 'bank' | 'card';
  accountName?: string;
  accountNumber: string;
  routingNumber?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  isDefault: boolean;
}

/**
 * Get external user's personal information
 */
export const getPersonalInfo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const currentRole = req.auth?.currentRole;

    if (!userId || !currentRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Only allow external users (accountants, subcontractors)
    if (!['accountant', 'subcontractor'].includes(currentRole.type)) {
      res.status(403).json({ error: 'Access denied: External users only' });
      return;
    }

    const user = await User.findById(userId).select(
      '-password -resetPasswordOTP -resetPasswordOTPExpiry',
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get role-specific information
    const userRole = await UserRoles.findById(currentRole.id).populate(
      'businessOwner',
      'firstName lastName businessName',
    );

    if (!userRole) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    // Use role-specific profile data if available, otherwise fall back to main User data
    const roleProfile = userRole.roleContext?.profile || ({} as RoleProfile);

    res.json({
      success: true,
      data: {
        personalInfo: {
          firstName: roleProfile.firstName || user.firstName,
          lastName: roleProfile.lastName || user.lastName,
          email: user.email, // Email should always come from main user
          phone: roleProfile.phoneNumber || user.phoneNumber,
          address: roleProfile.address || user.address,
          city: roleProfile.city || user.city,
          state: roleProfile.state || user.state,
          zipCode: roleProfile.postalCode || user.postalCode,
          businessName: roleProfile.businessName || user.businessName,
          businessType: roleProfile.businessType || user.businessType,
          taxId: roleProfile.taxId || user.taxId,
          profilePicture: roleProfile.profilePicture || user.profilePicture,
          paymentInfo: roleProfile.paymentInfo,
        },
        roleInfo: {
          type: userRole?.roleType,
          accessLevel: userRole?.accessLevel,
          businessOwner: userRole?.businessOwner,
          hasRoleSpecificProfile: !!roleProfile.firstName, // Indicates if this role has custom profile data
        },
      },
    });
  } catch (error) {
    console.error('Get personal info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update external user's personal information
 */
export const updatePersonalInfo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const currentRole = req.auth?.currentRole;

    if (!userId || !currentRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Only allow external users (accountants, subcontractors)
    if (!['accountant', 'subcontractor'].includes(currentRole.type)) {
      res.status(403).json({ error: 'Access denied: External users only' });
      return;
    }

    const {
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      businessName,
      businessType,
      taxId,
      profilePicture,
      paymentInfo,
    } = req.body;

    // Find the user role
    const userRole = await UserRoles.findById(currentRole.id);

    if (!userRole) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    // Initialize roleContext.profile if it doesn't exist
    if (!userRole.roleContext) {
      userRole.roleContext = {
        projectIds: [],
        clientIds: [],
        metadata: {},
        profile: {},
      };
    } else if (!userRole.roleContext.profile) {
      userRole.roleContext.profile = {};
    }

    // Update role-specific profile data (separate from main User document)
    const profileUpdate: any = {};

    if (firstName !== undefined) profileUpdate.firstName = firstName;
    if (lastName !== undefined) profileUpdate.lastName = lastName;
    if (phone !== undefined) profileUpdate.phoneNumber = phone;
    if (address !== undefined) profileUpdate.address = address;
    if (city !== undefined) profileUpdate.city = city;
    if (state !== undefined) profileUpdate.state = state;
    if (zipCode !== undefined) profileUpdate.postalCode = zipCode;
    if (businessName !== undefined) profileUpdate.businessName = businessName;
    if (businessType !== undefined) profileUpdate.businessType = businessType;
    if (taxId !== undefined) profileUpdate.taxId = taxId;
    if (profilePicture !== undefined)
      profileUpdate.profilePicture = profilePicture;
    if (paymentInfo !== undefined) profileUpdate.paymentInfo = paymentInfo;

    // Update the role-specific profile
    userRole.roleContext.profile = {
      ...userRole.roleContext.profile,
      ...profileUpdate,
      profileUpdatedAt: new Date(),
    };

    // Mark the nested object as modified for Mongoose
    userRole.markModified('roleContext.profile');

    await userRole.save();

    // Return updated profile
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        personalInfo: {
          firstName: userRole.roleContext.profile.firstName,
          lastName: userRole.roleContext.profile.lastName,
          phone: userRole.roleContext.profile.phoneNumber,
          address: userRole.roleContext.profile.address,
          city: userRole.roleContext.profile.city,
          state: userRole.roleContext.profile.state,
          zipCode: userRole.roleContext.profile.postalCode,
          businessName: userRole.roleContext.profile.businessName,
          businessType: userRole.roleContext.profile.businessType,
          taxId: userRole.roleContext.profile.taxId,
          profilePicture: userRole.roleContext.profile.profilePicture,
          paymentInfo: userRole.roleContext.profile.paymentInfo,
        },
        roleInfo: {
          type: userRole.roleType,
          accessLevel: userRole.accessLevel,
          hasRoleSpecificProfile: true,
        },
      },
    });
  } catch (error) {
    console.error('Update personal info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get payment methods (subcontractors only)
 */
export const getPaymentMethods = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const currentRole = req.auth?.currentRole;

    if (!userId || !currentRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Only allow subcontractors
    if (currentRole.type !== 'subcontractor') {
      res.status(403).json({ error: 'Access denied: Subcontractors only' });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get payment methods from user profile
    // For now, return mock data - in production, this would be stored securely
    const paymentMethods: PaymentMethod[] = (user.paymentMethods as any)?.map(
      (method: any) => ({
        id: method.id,
        type: method.type,
        accountName: method.accountName,
        accountNumber: method.accountNumber,
        routingNumber: method.routingNumber,
        cardNumber: method.cardNumber,
        expiryDate: method.expiryDate,
        isDefault: method.isDefault,
      }),
    ) || [
      {
        id: '1',
        type: 'bank',
        accountName: 'Business Checking',
        accountNumber: '****1234',
        routingNumber: '021000021',
        isDefault: true,
      },
    ];

    res.json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Add payment method (subcontractors only)
 */
export const addPaymentMethod = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const currentRole = req.auth?.currentRole;

    if (!userId || !currentRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Only allow subcontractors
    if (currentRole.type !== 'subcontractor') {
      res.status(403).json({ error: 'Access denied: Subcontractors only' });
      return;
    }

    const {
      type,
      accountName,
      accountNumber,
      routingNumber,
      cardNumber,
      expiryDate,
      cvv,
    } = req.body;

    // Validate required fields
    if (!type || !accountNumber) {
      res
        .status(400)
        .json({ error: 'Payment type and account number are required' });
      return;
    }

    if (type === 'bank' && !routingNumber) {
      res
        .status(400)
        .json({ error: 'Routing number is required for bank accounts' });
      return;
    }

    if (type === 'card' && (!expiryDate || !cvv)) {
      res
        .status(400)
        .json({ error: 'Expiry date and CVV are required for cards' });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Create new payment method
    const newPaymentMethod: PaymentMethod = {
      id: Date.now().toString(), // In production, use proper UUID
      type,
      accountName,
      accountNumber:
        type === 'bank'
          ? `****${accountNumber.slice(-4)}`
          : `****${accountNumber.slice(-4)}`,
      routingNumber: type === 'bank' ? routingNumber : undefined,
      cardNumber: type === 'card' ? `****${cardNumber.slice(-4)}` : undefined,
      expiryDate: type === 'card' ? expiryDate : undefined,
      isDefault: !user.paymentMethods || user.paymentMethods.length === 0,
    };

    // Add to user's payment methods
    if (!user.paymentMethods) {
      user.paymentMethods = [] as any;
    }
    user.paymentMethods.push(newPaymentMethod as any);

    await user.save();

    res.json({
      success: true,
      message: 'Payment method added successfully',
      data: newPaymentMethod,
    });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Remove payment method (subcontractors only)
 */
export const removePaymentMethod = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const currentRole = req.auth?.currentRole;
    const { methodId } = req.params;

    if (!userId || !currentRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Only allow subcontractors
    if (currentRole.type !== 'subcontractor') {
      res.status(403).json({ error: 'Access denied: Subcontractors only' });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.paymentMethods) {
      res.status(404).json({ error: 'Payment method not found' });
      return;
    }

    // Find and remove the payment method
    const methodIndex = user.paymentMethods.findIndex(
      (method: any) => method.id === methodId,
    );

    if (methodIndex === -1) {
      res.status(404).json({ error: 'Payment method not found' });
      return;
    }

    const removedMethod = user.paymentMethods[methodIndex];
    user.paymentMethods.splice(methodIndex, 1);

    // If removed method was default and there are other methods, set first as default
    if (removedMethod.isDefault && user.paymentMethods.length > 0) {
      user.paymentMethods[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Set default payment method (subcontractors only)
 */
export const setDefaultPaymentMethod = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.auth?.userId;
    const currentRole = req.auth?.currentRole;
    const { methodId } = req.params;

    if (!userId || !currentRole) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Only allow subcontractors
    if (currentRole.type !== 'subcontractor') {
      res.status(403).json({ error: 'Access denied: Subcontractors only' });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.paymentMethods) {
      res.status(404).json({ error: 'Payment method not found' });
      return;
    }

    // Find the method to set as default
    const method = user.paymentMethods.find(
      (method: any) => method.id === methodId,
    );

    if (!method) {
      res.status(404).json({ error: 'Payment method not found' });
      return;
    }

    // Set all methods to non-default, then set the selected one as default
    user.paymentMethods.forEach((method: any) => {
      method.isDefault = method.id === methodId;
    });

    await user.save();

    res.json({
      success: true,
      message: 'Default payment method updated successfully',
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
