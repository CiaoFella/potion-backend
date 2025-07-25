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
} from '../controllers/stripeController';

const router = express.Router();

router.post('/checkout/direct', createDirectCheckout);

router.post('/subscription', auth, createUserSubscription);
router.delete('/subscription', auth, cancelUserSubscription);
router.get('/subscription', auth, getUserSubscription);
router.post('/subscription/checkout', auth, createSubscriptionCheckout);
router.post('/customer-portal', auth, createCustomerPortal);
export default router;
