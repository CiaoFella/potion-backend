import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      subscriptionStatus?: {
        isActive: boolean;
        reason?: string;
        allowedPaths?: string[];
      };
    }
  }
}

/**
 * Subscription access control middleware
 * Checks if user has valid subscription access based on:
 * - Active subscription status
 * - Trial period validity
 * - Current period end date
 */
export const checkSubscriptionAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Skip subscription check for certain paths
    const allowedPaths = [
      '/api/auth/',
      '/api/pay/subscription',
      '/api/pay/customer-portal',
      '/webhooks/',
      '/api/user/profile',
      '/api/auth/logout',
    ];

    // Check if the current path should bypass subscription check
    const shouldBypass = allowedPaths.some((path) =>
      req.originalUrl.startsWith(path),
    );

    if (shouldBypass) {
      return next();
    }

    // Get user ID from request (set by auth middleware)
    const userId = req.user?.userId;
    if (!userId) {
      if (!res.headersSent) {
        res.status(401).json({
          message: 'Authentication required',
          subscriptionRequired: false,
        });
      }
      return;
    }

    // Get user with subscription details
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        message: 'User not found',
        subscriptionRequired: false,
      });
      return;
    }

    // Check subscription status
    const subscriptionStatus = await evaluateSubscriptionAccess(user);

    // Add subscription status to request
    req.subscriptionStatus = subscriptionStatus;

    // If subscription is not active, block access
    if (!subscriptionStatus.isActive) {
      res.status(402).json({
        message: 'Subscription required',
        reason: subscriptionStatus.reason,
        subscriptionRequired: true,
        subscription: {
          status: user.subscription?.status || 'none',
          currentPeriodEnd: user.subscription?.currentPeriodEnd,
        },
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Subscription access check error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        message: 'Internal server error',
        subscriptionRequired: false,
      });
    }
  }
};

/**
 * Evaluate if user has valid subscription access
 */
async function evaluateSubscriptionAccess(user: any): Promise<{
  isActive: boolean;
  reason?: string;
}> {
  // If no subscription object, user needs to subscribe
  if (!user.subscription) {
    return {
      isActive: false,
      reason: 'No subscription found. Please subscribe to continue.',
    };
  }

  const subscription = user.subscription;
  const currentDate = new Date();

  // Check if subscription is active
  if (subscription.status === 'active') {
    return { isActive: true };
  }

  // Check if user is in trial period
  if (subscription.status === 'trialing') {
    if (
      subscription.trialEndsAt &&
      new Date(subscription.trialEndsAt) > currentDate
    ) {
      return { isActive: true };
    } else {
      return {
        isActive: false,
        reason: 'Your trial period has ended. Please subscribe to continue.',
      };
    }
  }

  // Check if subscription was canceled but still in grace period
  if (subscription.status === 'canceled') {
    if (
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd) > currentDate
    ) {
      return { isActive: true }; // Still in grace period
    } else {
      return {
        isActive: false,
        reason: 'Your subscription has ended. Please resubscribe to continue.',
      };
    }
  }

  // Check other subscription statuses
  if (subscription.status === 'past_due') {
    // Give grace period for past due (usually 7-14 days)
    if (
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd) > currentDate
    ) {
      return { isActive: true }; // Still in grace period
    } else {
      return {
        isActive: false,
        reason: 'Your payment is overdue. Please update your payment method.',
      };
    }
  }

  if (subscription.status === 'unpaid') {
    return {
      isActive: false,
      reason: 'Payment required. Please update your payment method.',
    };
  }

  // For any other status (incomplete, incomplete_expired, etc.)
  return {
    isActive: false,
    reason:
      'Subscription issue detected. Please contact support or resubscribe.',
  };
}

/**
 * Optional middleware for routes that should be accessible even with expired subscription
 * (like subscription management, profile settings, etc.)
 */
export const allowWithExpiredSubscription = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // This middleware can be used for specific routes that should remain accessible
  // even when subscription is expired (e.g., billing settings, profile)
  next();
};
