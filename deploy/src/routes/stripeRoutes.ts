// routes/subscriptionRoutes.ts
import express from "express";
import { auth } from "../middleware/auth";
import {
  createUserSubscription,
  cancelUserSubscription,
  getUserSubscription,
  createSubscriptionCheckout,
  createCustomerPortal,
} from "../controllers/stripeController";
import { handleStripeWebhook } from "../controllers/webhookController";

const router = express.Router();

// Routes that require authentication
router.post("/subscription", auth, createUserSubscription);
router.delete("/subscription", auth, cancelUserSubscription);
router.get("/subscription", auth, getUserSubscription);
router.post("/subscription/checkout", auth, createSubscriptionCheckout);
router.post("/subscription/portal", auth, createCustomerPortal);

// Stripe webhook endpoint (no auth required, secured by Stripe signature)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

export default router;
