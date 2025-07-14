// controllers/subscriptionController.ts
import { Request, Response } from "express";
import { User } from "../models/User";
import {
  createCustomer,
  createSubscription,
  cancelSubscription,
  retrieveSubscription,
  updateSubscription,
  createBillingPortalSession,
  createCheckoutSession,
} from "../services/stripeService";
import { config } from "../config/config";

// Initialize subscription during registration
export const initializeSubscription = async (
  userId: string,
  email: string,
  fullName: string
): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create a customer in Stripe
    const customerId = await createCustomer(email, fullName);

    // Update user with Stripe customer ID
    user.subscription = {
      status: null,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      stripePriceId: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
    };

    await user.save();
  } catch (error) {
    console.error("Failed to initialize subscription:", error);
    throw error;
  }
};

// Create a new subscription with trial period
export const createUserSubscription = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { priceId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      // Create customer if it doesn't exist
      customerId = await createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`
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
      7 // 7-day trial
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
      message: "Subscription created successfully",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialEnd: subscription.trial_end,
        currentPeriodEnd: subscription.current_period_end,
      },
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    res.status(500).json({ message: "Failed to create subscription", error });
  }
};

// Cancel a subscription
export const cancelUserSubscription = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId);
    if (!user || !user.subscription?.stripeSubscriptionId) {
      return res
        .status(404)
        .json({ message: "User or subscription not found" });
    }

    const canceledSubscription = await cancelSubscription(
      user.subscription.stripeSubscriptionId
    );

    // Update user subscription status
    user.subscription.status = canceledSubscription.status;
    await user.save();

    res.json({
      message: "Subscription canceled successfully",
      status: canceledSubscription.status,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ message: "Failed to cancel subscription", error });
  }
};

// Get current subscription details
export const getUserSubscription = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.subscription?.stripeSubscriptionId) {
      return res.json({
        message: "No active subscription",
        subscription: null,
      });
    }

    // Get latest subscription details from Stripe
    const subscription = await retrieveSubscription(
      user.subscription.stripeSubscriptionId
    );

    // Update local subscription data with latest from Stripe
    user.subscription.status = subscription.status;
    user.subscription.currentPeriodEnd = new Date(
      subscription.current_period_end * 1000
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
    console.error("Get subscription error:", error);
    res.status(500).json({ message: "Failed to get subscription", error });
  }
};

// Create Stripe Checkout session for subscription
export const createSubscriptionCheckout = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { priceId, successUrl, cancelUrl } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      // Create customer if it doesn't exist
      customerId = await createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`
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
      7 // 7-day trial
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Create checkout error:", error);
    res
      .status(500)
      .json({ message: "Failed to create checkout session", error });
  }
};

// Create customer portal session
export const createCustomerPortal = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { returnUrl } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.subscription?.stripeCustomerId) {
      return res.status(404).json({ message: "User or customer not found" });
    }

    const portalSession = await createBillingPortalSession(
      user.subscription.stripeCustomerId,
      returnUrl
    );

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error("Create portal error:", error);
    res
      .status(500)
      .json({ message: "Failed to create customer portal", error });
  }
};
