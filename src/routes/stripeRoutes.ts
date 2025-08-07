// routes/subscriptionRoutes.ts
import express from 'express';
import { auth } from '../middleware/auth';
import {
  createUserSubscription,
  cancelUserSubscription,
  getUserSubscription,
  createSubscriptionCheckout,
  createCustomerPortal,
  createDirectCheckout,
  getSessionCustomerEmail,
} from '../controllers/stripeController';
import { handleStripeWebhook } from '../controllers/webhookController';

const router = express.Router();

// Webhook route - must handle raw body, so it's defined before other routes
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
);

router.post('/checkout/direct', createDirectCheckout);
router.get('/session/:sessionId', getSessionCustomerEmail);

router.post('/subscription', auth, createUserSubscription);
router.delete('/subscription', auth, cancelUserSubscription);
router.get('/subscription', auth, getUserSubscription);
router.post('/subscription/checkout', auth, createSubscriptionCheckout);
router.post('/customer-portal', auth, createCustomerPortal);
export default router;
