// controllers/subscriptionController.ts
import { Request, Response } from 'express';
import { User } from '../models/User';
import Stripe from 'stripe';

import {
  createCustomer,
  createSubscription,
  cancelSubscription,
  retrieveSubscription,
  updateSubscription,
  createBillingPortalSession,
  createCheckoutSession,
} from '../services/stripeService';
import { config } from '../config/config';

const stripe = new Stripe(config.stripeSecretKey!, {
  apiVersion: '2025-02-24.acacia',
});

// Create a new subscription with trial period
export const createUserSubscription = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { priceId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      // Create customer if it doesn't exist
      customerId = await createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
      );

      // Ensure subscription object exists and update with new customer ID
      user.subscription = user.subscription || {};
      user.subscription.stripeCustomerId = customerId;
      await user.save();
    }

    // Create subscription with 7-day trial
    const subscription = await createSubscription(
      customerId,
      priceId,
      7, // 7-day trial
    );

    // Update user with subscription details
    user.subscription = {
      ...user.subscription,
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      trialEndsAt: new Date(subscription.trial_end * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    await user.save();

    res.json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEnd: subscription.trial_end,
        currentPeriodEnd: subscription.current_period_end,
      },
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: 'Failed to create subscription', error });
  }
};

// Cancel a subscription
export const cancelUserSubscription = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId);
    if (!user || !user.subscription?.stripeSubscriptionId) {
      return res
        .status(404)
        .json({ message: 'User or subscription not found' });
    }

    const canceledSubscription = await cancelSubscription(
      user.subscription.stripeSubscriptionId,
    );

    // Update user subscription status
    user.subscription.status = canceledSubscription.status;
    await user.save();

    res.json({
      message: 'Subscription canceled successfully',
      status: canceledSubscription.status,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Failed to cancel subscription', error });
  }
};

// Get current subscription details
export const getUserSubscription = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.subscription?.stripeSubscriptionId) {
      return res.json({
        message: 'No active subscription',
        subscription: null,
      });
    }

    // Get latest subscription details from Stripe
    const subscription = await retrieveSubscription(
      user.subscription.stripeSubscriptionId,
    );

    // Update local subscription data with latest from Stripe
    user.subscription.status = subscription.status;
    user.subscription.currentPeriodEnd = new Date(
      subscription.current_period_end * 1000,
    );
    if (subscription.trial_end) {
      user.subscription.trialEndsAt = new Date(subscription.trial_end * 1000);
    }

    await user.save();

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEnd: subscription.trial_end,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Failed to get subscription', error });
  }
};

// Create direct Stripe Checkout session (no user form - collects info in Stripe)
export const createDirectCheckout = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const { priceId, successUrl, cancelUrl, metadata } = req.body;

  // Validate required fields
  if (!priceId) {
    return res.status(400).json({ message: 'Price ID is required' });
  }

  try {
    // Prepare session configuration
    const sessionConfig: any = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ['card'],
      allow_promotion_codes: true,
    };

    // If metadata is provided (e.g., Google user info), include it
    if (metadata) {
      sessionConfig.metadata = metadata;

      // If we have Google user info, pre-fill customer email
      if (metadata.email) {
        sessionConfig.customer_email = metadata.email;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Create direct checkout error:', error);
    res.status(500).json({
      message: 'Failed to create checkout session',
      error,
    });
  }
};

// Create Stripe Checkout session for subscription
export const createSubscriptionCheckout = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { priceId, successUrl, cancelUrl } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      // Create customer if it doesn't exist
      customerId = await createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
      );

      // Ensure subscription object exists and update with new customer ID
      user.subscription = user.subscription || {};
      user.subscription.stripeCustomerId = customerId;
      await user.save();
    }

    // Create checkout session
    const session = await createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      7, // 7-day trial
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    res
      .status(500)
      .json({ message: 'Failed to create checkout session', error });
  }
};

// Create customer portal session
export const createCustomerPortal = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { returnUrl } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if user has completed subscription setup
    if (!user.subscription?.stripeCustomerId) {
      return res.status(400).json({
        message:
          'Subscription not found. Please complete your subscription setup to access billing management.',
        code: 'SUBSCRIPTION_INCOMPLETE',
        action: 'COMPLETE_SUBSCRIPTION',
      });
    }

    const portalSession = await createBillingPortalSession(
      user.subscription.stripeCustomerId,
      returnUrl,
    );

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Create portal error:', error);
    res
      .status(500)
      .json({ message: 'Failed to create customer portal', error });
  }
};
