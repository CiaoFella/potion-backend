// services/stripeService.ts
import Stripe from "stripe";
import { config } from "../config/config";

const stripe = new Stripe(config.stripeSecretKey!, {
  apiVersion: "2025-02-24.acacia",
});

export const createCustomer = async (
  email: string,
  name: string
): Promise<string> => {
  const customer = await stripe.customers.create({
    email,
    name,
  });

  return customer.id;
};

export const createSubscription = async (
  customerId: string,
  priceId: string,
  trialDays: number = 7
): Promise<Stripe.Subscription> => {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    expand: ["latest_invoice.payment_intent"],
  });
};

export const cancelSubscription = async (
  subscriptionId: string
): Promise<Stripe.Subscription> => {
  return await stripe.subscriptions.cancel(subscriptionId);
};

export const retrieveSubscription = async (
  subscriptionId: string
): Promise<Stripe.Subscription> => {
  return await stripe.subscriptions.retrieve(subscriptionId);
};

export const updateSubscription = async (
  subscriptionId: string,
  priceId: string
): Promise<Stripe.Subscription> => {
  return await stripe.subscriptions.update(subscriptionId, {
    items: [{ price: priceId }],
    proration_behavior: "create_prorations",
  });
};

export const createBillingPortalSession = async (
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  trialDays: number = 7,
  metadata?: { firstName: string; lastName: string; email: string }
): Promise<Stripe.Checkout.Session> => {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    subscription_data: {
      trial_period_days: trialDays,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_types: ["card"],
    metadata: metadata || {},
  });
};
