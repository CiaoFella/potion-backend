import { Request, Response } from "express";
import Stripe from "stripe";
import { config } from "../config/config";
import { User } from "../models/User";

const stripe = new Stripe(config.stripeSecretKey!, {
  apiVersion: "2025-02-24.acacia",
});

export const handleStripeWebhook = async (
  req: Request,
  res: Response
): Promise<any> => {
  const sig = req.headers["stripe-signature"] as string;
  let event = req.body;

  console.log(`Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error handling webhook event:", error);
    return res.status(500).send("Webhook processing error");
  }

  res.json({ received: true });
};

// Handle Checkout Session Completion
const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session
) => {
  if (!session.customer || !session.subscription) return;

  try {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    // Retrieve subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Find user by Stripe Customer ID
    const user = await User.findOne({
      "subscription.stripeCustomerId": customerId,
    });
    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    // Update subscription details in the database
    user.subscription = {
      ...(user?.subscription||{}),
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    };

    await user.save();
    console.log(`Subscription activated for user: ${user.email}`);
  } catch (error) {
    console.error("Error processing checkout session:", error);
  }
};

// Handle Subscription Created/Updated Events
const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({
      "subscription.stripeCustomerId": customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    user.subscription = {
      ...(user?.subscription||{}),
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
    };

    await user.save();
    console.log(`Subscription updated for user: ${user.email}`);
  } catch (error) {
    console.error("Error updating subscription:", error);
  }
};

// Handle Subscription Deletion
const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({
      "subscription.stripeCustomerId": customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    user.subscription.status = "canceled";
    await user.save();
    console.log(`Subscription canceled for user: ${user.email}`);
  } catch (error) {
    console.error("Error handling subscription deletion:", error);
  }
};

// Handle Trial Ending Soon
const handleTrialWillEnd = async (subscription: Stripe.Subscription) => {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({
      "subscription.stripeCustomerId": customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    console.log(`Trial ending soon for user: ${user.email}`);
    // Send email notification logic can be added here
  } catch (error) {
    console.error("Error handling trial ending:", error);
  }
};

// Handle Successful Invoice Payment
const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
  try {
    if (!invoice.subscription) return;

    const customerId = invoice.customer as string;
    const user = await User.findOne({
      "subscription.stripeCustomerId": customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    if (invoice.billing_reason === "subscription_create") {
      console.log(`Subscription activated for user: ${user.email}`);
    }

    if (user.subscription.status !== "active") {
      user.subscription.status = "active";
      await user.save();
    }
  } catch (error) {
    console.error("Error handling invoice payment success:", error);
  }
};

// Handle Failed Invoice Payment
const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  try {
    if (!invoice.subscription) return;

    const customerId = invoice.customer as string;
    const user = await User.findOne({
      "subscription.stripeCustomerId": customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    if (user.subscription.status !== "past_due") {
      user.subscription.status = "past_due";
      await user.save();
    }

    console.log(`Payment failed for user: ${user.email}`);
    // Send email notification logic can be added here
  } catch (error) {
    console.error("Error handling invoice payment failure:", error);
  }
};
