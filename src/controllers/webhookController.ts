import { Request, Response } from 'express';
import Stripe from 'stripe';
import { config } from '../config/config';
import { User } from '../models/User';
import crypto from 'crypto';
import { sendEmail } from '../services/emailService';
import { myEmitter } from '../services/eventEmitter';
import { reactEmailService } from '../services/reactEmailService';
import type { PasswordSetupProps } from '../templates/react-email/password-setup';
import type { CheckoutAbandonedProps } from '../templates/react-email/checkout-abandoned';
import type { TrialEndingProps } from '../templates/react-email/trial-ending';
import type { PaymentFailedProps } from '../templates/react-email/payment-failed';
import type { AsyncPaymentSuccessProps } from '../templates/react-email/async-payment-success';
import type { AsyncPaymentFailedProps } from '../templates/react-email/async-payment-failed';
import type { SubscriptionCancelledProps } from '../templates/react-email/subscription-cancelled';
import type { SubscriptionPausedProps } from '../templates/react-email/subscription-paused';
import type { SubscriptionResumedProps } from '../templates/react-email/subscription-resumed';

const stripe = new Stripe(config.stripeSecretKey!, {
  apiVersion: '2025-02-24.acacia',
});

export const handleStripeWebhook = async (
  req: Request,
  res: Response,
): Promise<any> => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      config.stripeWebhookSecret!,
    );
  } catch (err: any) {
    if (process.env.NODE_ENV === 'DEV') {
      try {
        if (typeof req.body === 'object' && req.body.id && req.body.type) {
          event = req.body as Stripe.Event;
        } else {
          const bodyStr = req.body.toString();
          event = JSON.parse(bodyStr) as Stripe.Event;
        }
      } catch (parseErr: any) {
        return res
          .status(400)
          .send(
            `Webhook Error: Unable to parse webhook body - ${parseErr.message}`,
          );
      }
    } else {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  try {
    switch (event.type) {
      // CHECKOUT EVENTS
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'checkout.session.expired':
        await handleCheckoutExpired(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'checkout.session.async_payment_succeeded':
        await handleAsyncPaymentSucceeded(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'checkout.session.async_payment_failed':
        await handleAsyncPaymentFailed(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      // SUBSCRIPTION EVENTS
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.paused':
        await handleSubscriptionPaused(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(
          event.data.object as Stripe.Subscription,
        );
        break;

      // INVOICE EVENTS
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // CUSTOMER PORTAL EVENTS
      case 'billing_portal.session.created':
        // Log when user enters customer portal
        console.log('Customer portal session created:', event.data.object);
        break;

      default:
      // Unhandled event type
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return res.status(500).send('Webhook processing error');
  }

  res.json({ received: true });
};

// Handle successful checkout completion
const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  if (!session.customer || !session.subscription) {
    return;
  }

  try {
    const { firstName, lastName, email, googleId, authProvider } =
      session.metadata || {};
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    // If no metadata, this is probably an existing user checkout
    if (!email) {
      await handleExistingUserCheckout(session);
      return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Check if this is a Google-authenticated user
    const isGoogleUser = authProvider === 'google' && googleId;

    // Create or update user
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      const userData = {
        firstName,
        lastName,
        email,
        signupSource: 'checkout',
        checkoutSessionId: session.id,
        subscription: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          status: subscription.status,
          trialEndsAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      };

      if (isGoogleUser) {
        // Google-authenticated user
        user = new User({
          ...userData,
          password: 'NO_PASSWORD_GOOGLE_AUTH', // Placeholder - won't be used
          isPasswordSet: true, // They don't need password setup
          googleId,
          authProvider: 'google',
        });
      } else {
        // Regular checkout user
        user = new User({
          ...userData,
          password: 'TEMP_PASSWORD', // Will be replaced when password is set
          isPasswordSet: false,
          authProvider: 'password',
        });
      }

      // Emit new user event for CRM categories creation
      myEmitter.emit('new-user', user);
    } else {
      // Update existing user's subscription
      user.subscription = {
        ...(user.subscription || {}),
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        status: subscription.status,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };

      // If this is a Google user and they don't have Google auth set up, update them
      if (isGoogleUser && user.authProvider !== 'google') {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.isPasswordSet = true; // They can now login with Google
      }
    }

    await user.save();

    // Handle post-checkout actions based on auth method
    if (isGoogleUser) {
      // Google user - no password setup needed
      console.log(
        `Google-authenticated user checkout completed: ${email}. User can login with Google.`,
      );
    } else {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      user.passwordSetupToken = token;
      user.passwordSetupTokenExpiry = expiry;
      await user.save();

      try {
        await sendPasswordSetupEmail(email, firstName || 'there', token);
        console.log(
          `✅ [WEBHOOK] Password setup email sent successfully to: ${email}`,
        );
      } catch (emailError) {
        console.error(
          `❌ [WEBHOOK] Failed to send password setup email to: ${email}`,
          emailError,
        );
      }
    }
  } catch (error) {
    console.error('Error processing checkout completion:', error);
  }
};

// Handle existing user checkout OR direct checkout (no metadata)
const handleExistingUserCheckout = async (session: Stripe.Checkout.Session) => {
  try {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    // Get customer and subscription details from Stripe
    const [customer, subscription] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.subscriptions.retrieve(subscriptionId),
    ]);

    // Extract customer details
    const customerEmail = (customer as Stripe.Customer).email;
    const customerName = (customer as Stripe.Customer).name;

    if (!customerEmail) {
      console.error('No email found in customer data:', customerId);
      return;
    }

    // Find user by email or Stripe Customer ID
    let user = await User.findOne({
      $or: [
        { email: customerEmail },
        { 'subscription.stripeCustomerId': customerId },
      ],
    });

    if (!user) {
      // This is a new direct checkout - create user from Stripe customer data
      const nameParts = customerName?.split(' ') || ['User', ''];
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || '';

      user = new User({
        firstName,
        lastName,
        email: customerEmail,
        password: 'TEMP_PASSWORD', // Will be replaced when password is set
        isPasswordSet: false,
        signupSource: 'checkout',
        checkoutSessionId: session.id,
        subscription: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscription.items.data[0].price.id,
          status: subscription.status,
          trialEndsAt: subscription.trial_end
            ? new Date(subscription.trial_end * 1000)
            : null,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });

      // Generate password setup token (24-48 hours expiry)
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      user.passwordSetupToken = token;
      user.passwordSetupTokenExpiry = expiry;

      // Emit new user event for CRM categories creation
      myEmitter.emit('new-user', user);

      await user.save();

      try {
        await sendPasswordSetupEmail(customerEmail, firstName, token);
        console.log(
          `✅ [WEBHOOK-DIRECT] Password setup email sent successfully to: ${customerEmail}`,
        );
      } catch (emailError) {
        console.error(
          `❌ [WEBHOOK-DIRECT] Failed to send password setup email to: ${customerEmail}`,
          emailError,
        );
      }
    } else {
      // Update existing user's subscription
      user.subscription = {
        ...(user?.subscription || {}),
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        status: subscription.status,
        trialEndsAt: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      };

      // Check if existing user truly needs password setup (check actual password, not just flag)
      const needsPasswordSetup = !user.password || user.password.length === 0;

      if (needsPasswordSetup) {
        console.log(`Existing user needs password setup: ${user.email}`);

        // Generate new password setup token if they don't have one
        if (
          !user.passwordSetupToken ||
          !user.passwordSetupTokenExpiry ||
          user.passwordSetupTokenExpiry < new Date()
        ) {
          const token = crypto.randomBytes(32).toString('hex');
          const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

          user.passwordSetupToken = token;
          user.passwordSetupTokenExpiry = expiry;

          // Send password setup email
          await sendPasswordSetupEmail(user.email, user.firstName, token);
          console.log(
            `Password setup email sent to existing user: ${user.email}`,
          );
        } else {
          console.log(
            `User already has valid password setup token: ${user.email}`,
          );
        }
      } else {
        console.log(`Existing user already has password set: ${user.email}`);

        // Fix the password flag if it's incorrect
        if (!user.isPasswordSet) {
          console.log(`Fixing password flag for user: ${user.email}`);
          user.isPasswordSet = true;
        }

        // Always send password reset email for existing users with passwords after checkout
        console.log(
          `Sending password reset email to existing user with password: ${user.email}`,
        );

        // Generate new password setup token (reuse same token system for password reset)
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

        user.passwordSetupToken = token;
        user.passwordSetupTokenExpiry = expiry;

        // Send password setup email (user can use this to reset their password)
        await sendPasswordSetupEmail(user.email, user.firstName, token);
        console.log(
          `Password reset email sent to existing user: ${user.email}`,
        );
      }

      await user.save();
      console.log(`Subscription activated for existing user: ${user.email}`);
    }
  } catch (error) {
    console.error('Error processing existing user checkout:', error);
  }
};

// Handle abandoned checkout (session expired)
const handleCheckoutExpired = async (session: Stripe.Checkout.Session) => {
  const { firstName, lastName, email } = session.metadata || {};

  if (!email) return; // Skip if no user data

  try {
    console.log(`Checkout session expired for ${email}`);

    // Send abandoned checkout follow-up email using React Email
    await sendAbandonedCheckoutEmail(email, firstName || 'there');

    // Log for analytics (you can expand this)
    console.log(`Abandoned checkout logged for ${email}`);
  } catch (error) {
    console.error('Error handling checkout expiration:', error);
  }
};

// Handle successful async payment (bank transfers, etc.)
const handleAsyncPaymentSucceeded = async (
  session: Stripe.Checkout.Session,
) => {
  try {
    // Process similar to checkout completed
    await handleCheckoutCompleted(session);

    const { email, firstName } = session.metadata || {};
    if (email) {
      // Send additional success email for async payment
      await sendAsyncPaymentSuccessEmail(email, firstName || 'there');
    }
  } catch (error) {
    console.error('Error handling async payment success:', error);
  }
};

// Handle failed async payment
const handleAsyncPaymentFailed = async (session: Stripe.Checkout.Session) => {
  const { email, firstName } = session.metadata || {};

  if (!email) return;

  try {
    console.log(`Async payment failed for ${email}`);

    // Send payment failure email
    await sendAsyncPaymentFailedEmail(email, firstName || 'there');
  } catch (error) {
    console.error('Error handling async payment failure:', error);
  }
};

// Handle Subscription Created/Updated Events
const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  try {
    const customerId = subscription.customer as string;
    let user = await User.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!user) {
      try {
        const customer = await stripe.customers.retrieve(customerId);

        if (customer.deleted) {
          console.error(`Stripe customer ${customerId} is deleted`);
          return;
        }

        // Extract customer information (customer is now guaranteed to be a Customer, not DeletedCustomer)
        const customerData = customer as Stripe.Customer;
        const email = customerData.email;
        const name = customerData.name || '';
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        if (!email) {
          console.error(`No email found for Stripe Customer ID: ${customerId}`);
          return;
        }

        // Check if user exists by email
        user = await User.findOne({ email });

        if (!user) {
          // Create new user
          user = new User({
            firstName,
            lastName,
            email,
            signupSource: 'subscription_webhook',
            password: 'TEMP_PASSWORD', // Will be replaced when password is set
            isPasswordSet: false,
            authProvider: 'password',
            subscription: {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0].price.id,
              status: subscription.status,
              trialEndsAt: subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : null,
              currentPeriodEnd: new Date(
                subscription.current_period_end * 1000,
              ),
              cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
              canceledAt: subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000)
                : null,
              cancelAt: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000)
                : null,
            },
          });

          await user.save();

          // Emit new user event for CRM categories creation
          myEmitter.emit('new-user', user);

          // Send password setup email
          const token = crypto.randomBytes(32).toString('hex');
          const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

          user.passwordSetupToken = token;
          user.passwordSetupTokenExpiry = expiry;
          await user.save();

          try {
            await sendPasswordSetupEmail(email, firstName || 'there', token);
          } catch (emailError) {
            console.error(
              `❌ [WEBHOOK] Failed to send password setup email to: ${email}`,
              emailError,
            );
          }
          return;
        } else {
          user.subscription = user.subscription || {};
          user.subscription.stripeCustomerId = customerId;
        }
      } catch (stripeError) {
        console.error(
          `Failed to retrieve Stripe customer ${customerId}:`,
          stripeError,
        );
        return;
      }
    }

    // Check if subscription was just scheduled for cancellation
    const wasScheduledForCancellation =
      user.subscription?.cancelAtPeriodEnd || false;
    const isNowScheduledForCancellation = subscription.cancel_at_period_end;

    // Detect when cancellation was just scheduled (user canceled via customer portal)
    const justScheduledCancellation =
      !wasScheduledForCancellation && isNowScheduledForCancellation;

    // Detect when subscription was just resumed (user resumed via customer portal)
    const justResumedSubscription =
      wasScheduledForCancellation && !isNowScheduledForCancellation;

    user.subscription = {
      ...(user?.subscription || {}),
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      cancelAt: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000)
        : null,
    };

    await user.save();

    // Send cancellation email if subscription was just scheduled for cancellation
    if (justScheduledCancellation) {
      console.log(`🎯 CANCELLATION DETECTED: Sending email to ${user.email}`);
      await sendSubscriptionCancelledEmail(user.email, user.firstName);
      console.log(
        `✅ Subscription cancellation email sent successfully to: ${user.email}`,
      );

      // Extract feedback from cancellation details if available
      if (subscription.cancellation_details?.feedback) {
        console.log(
          `📝 Cancellation feedback: ${subscription.cancellation_details.feedback}`,
        );
        // You could store this feedback for analytics
      }
    }
    // Send resumption email if subscription was just resumed
    else if (justResumedSubscription) {
      console.log(
        `🎉 SUBSCRIPTION RESUMED: Sending welcome back email to ${user.email}`,
      );
      await sendSubscriptionResumedEmail(user.email, user.firstName);
      console.log(
        `✅ Subscription resumption email sent successfully to: ${user.email}`,
      );
    } else {
      console.log(
        `📄 Regular subscription update for: ${user.email} (no cancellation or resumption)`,
      );
    }

    console.log(`Subscription updated for user: ${user.email}`);
  } catch (error) {
    console.error('Error updating subscription:', error);
  }
};

// Handle Subscription Deletion
const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    user.subscription.status = 'canceled';
    await user.save();

    // Send subscription cancellation email
    await sendSubscriptionCancelledEmail(user.email, user.firstName);
    console.log(`Subscription canceled for user: ${user.email}`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
};

// Handle trial ending soon
const handleTrialWillEnd = async (subscription: Stripe.Subscription) => {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    // Calculate days remaining
    const daysRemaining = subscription.trial_end
      ? Math.ceil(
          (subscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24),
        )
      : 3;

    // Send trial ending soon email
    await sendTrialEndingEmail(user.email, user.firstName, daysRemaining);
    console.log(`Trial ending notification sent to user: ${user.email}`);
  } catch (error) {
    console.error('Error handling trial will end:', error);
  }
};

// Handle Successful Invoice Payment
const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
  try {
    if (!invoice.subscription) return;

    const customerId = invoice.customer as string;
    const user = await User.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    if (invoice.billing_reason === 'subscription_create') {
      console.log(`Subscription activated for user: ${user.email}`);
    }

    if (user.subscription.status !== 'active') {
      user.subscription.status = 'active';
      await user.save();
    }
  } catch (error) {
    console.error('Error handling invoice payment success:', error);
  }
};

// Handle Failed Invoice Payment
const handleInvoicePaymentFailed = async (invoice: Stripe.Invoice) => {
  try {
    if (!invoice.subscription) return;

    const customerId = invoice.customer as string;
    const user = await User.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    if (user.subscription.status !== 'past_due') {
      user.subscription.status = 'past_due';
      await user.save();
    }

    // Send payment failed email
    await sendPaymentFailedEmail(user.email, user.firstName);
    console.log(`Payment failed notification sent to user: ${user.email}`);
  } catch (error) {
    console.error('Error handling invoice payment failure:', error);
  }
};

// Handle Subscription Paused
const handleSubscriptionPaused = async (subscription: Stripe.Subscription) => {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    user.subscription = {
      ...(user?.subscription || {}),
      status: 'paused',
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    await user.save();

    // Send subscription paused email
    await sendSubscriptionPausedEmail(user.email, user.firstName);
    console.log(`Subscription paused for user: ${user.email}`);
  } catch (error) {
    console.error('Error handling subscription paused:', error);
  }
};

// Handle Subscription Resumed
const handleSubscriptionResumed = async (subscription: Stripe.Subscription) => {
  try {
    const customerId = subscription.customer as string;
    const user = await User.findOne({
      'subscription.stripeCustomerId': customerId,
    });

    if (!user) {
      console.error(`User not found for Stripe Customer ID: ${customerId}`);
      return;
    }

    user.subscription = {
      ...(user?.subscription || {}),
      status: subscription.status,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    await user.save();

    // Send subscription resumed email
    await sendSubscriptionResumedEmail(user.email, user.firstName);
    console.log(`Subscription resumed for user: ${user.email}`);
  } catch (error) {
    console.error('Error handling subscription resumed:', error);
  }
};

// React Email-based email sending functions
const sendPasswordSetupEmail = async (
  email: string,
  firstName: string,
  token: string,
) => {
  try {
    const setupUrl = `${config.frontURL}/setup-password/${token}`;

    const props: PasswordSetupProps = {
      firstName,
      setupUrl,
      trialDays: 7,
      monthlyPrice: 29,
      tokenExpiry: '48 hours',
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'password-setup',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending password setup email:', error);

    // Fallback to React Email fallback template
    const setupUrl = `${config.frontURL}/setup-password/${token}`;

    try {
      const fallbackProps = {
        firstName,
        subject: 'Welcome to Potion! Set up your password',
        actionUrl: setupUrl,
        actionText: 'Set Up Password',
        messageBody:
          'Welcome to Potion! To access your account, please set up your password:',
        tokenExpiry: '48 hours',
      };

      const { subject: fallbackSubject, html: fallbackHtml } =
        await reactEmailService.renderTemplate('email-fallback', fallbackProps);

      return sendEmail({
        to: email,
        subject: fallbackSubject,
        html: fallbackHtml,
      });
    } catch (fallbackError) {
      // Final fallback to plain HTML if React Email also fails
      console.error(
        'Fallback template also failed, using plain HTML:',
        fallbackError,
      );
      return sendEmail({
        to: email,
        subject: 'Welcome to Potion! Set up your password',
        html: `
          <div style="font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1EC64C 0%, #71F065 100%); color: #ffffff; padding: 40px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Potion</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333333; font-size: 28px; font-weight: 600; margin: 0 0 20px 0;">Hi ${firstName},</h2>
              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 16px 0;">Welcome to Potion! To access your account, please set up your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${setupUrl}" style="background-color: #1EC64C; color: #ffffff; padding: 14px 30px; border-radius: 6px; font-size: 16px; font-weight: 600; text-decoration: none; display: inline-block;">Set Up Password</a>
              </div>
              <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 16px 0;">This link expires in 48 hours.</p>
              <p style="color: #333333; font-size: 16px; line-height: 1.5; margin: 16px 0;">If you have any questions, please don't hesitate to reach out to our support team.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 30px; text-align: center;">
              <p style="font-size: 14px; color: #6c757d; margin: 8px 0;">Need help? Contact us at <a href="mailto:support@potionapp.com" style="color: #1EC64C; text-decoration: none;">support@potionapp.com</a></p>
              <p style="font-size: 14px; color: #6c757d; margin: 8px 0;">Potion • Building the future of business automation</p>
            </div>
          </div>
        `,
      });
    }
  }
};

const sendAbandonedCheckoutEmail = async (email: string, firstName: string) => {
  try {
    const props: CheckoutAbandonedProps = {
      firstName,
      checkoutUrl: `${config.frontURL}/checkout`,
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'checkout-abandoned',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending abandoned checkout email:', error);

    // Fallback
    return sendEmail({
      to: email,
      subject: 'Complete your Potion signup',
      html: `
        <h1>Hi ${firstName},</h1>
        <p>Complete your Potion signup and start your free trial:</p>
        <a href="${config.frontURL}/checkout">Complete Signup</a>
      `,
    });
  }
};

const sendTrialEndingEmail = async (
  email: string,
  firstName: string,
  daysRemaining: number,
) => {
  try {
    const props: TrialEndingProps = {
      firstName,
      daysRemaining,
      trialDays: 7,
      monthlyPrice: 29,
      billingUrl: `${config.frontURL}/billing`,
      // TODO: Add usage stats when available
      // usageStats: true,
      // projectsCreated: userStats.projectsCreated,
      // invoicesSent: userStats.invoicesSent,
      // tasksCompleted: userStats.tasksCompleted,
      // clientsAdded: userStats.clientsAdded,
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'trial-ending',
      props,
    );

    return sendEmail({
      to: email,
      subject: subject.replace('{{daysRemaining}}', daysRemaining.toString()),
      html,
    });
  } catch (error) {
    console.error('Error sending trial ending email:', error);

    // Fallback
    return sendEmail({
      to: email,
      subject: `Your Potion trial ends in ${daysRemaining} days`,
      html: `
        <h1>Hi ${firstName},</h1>
        <p>Your 7-day Potion trial ends in ${daysRemaining} days.</p>
        <p>Keep your access to all premium features by continuing your subscription.</p>
        <a href="${config.frontURL}/billing">Manage Subscription</a>
      `,
    });
  }
};

const sendPaymentFailedEmail = async (email: string, firstName: string) => {
  try {
    const props: PaymentFailedProps = {
      firstName,
      billingUrl: `${config.frontURL}/billing`,
      gracePeriod: '7 days',
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'payment-failed',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending payment failed email:', error);

    // Fallback
    return sendEmail({
      to: email,
      subject: 'Action needed: Payment failed for your Potion subscription',
      html: `
        <h1>Payment Issue, ${firstName}</h1>
        <p>We weren't able to process payment for your Potion subscription.</p>
        <p>Please update your payment method to continue your service:</p>
        <a href="${config.frontURL}/billing">Update Payment Method</a>
      `,
    });
  }
};

const sendAsyncPaymentSuccessEmail = async (
  email: string,
  firstName: string,
) => {
  try {
    const props: AsyncPaymentSuccessProps = {
      firstName,
      trialDays: 7,
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'async-payment-success',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending async payment success email:', error);

    // Fallback
    return sendEmail({
      to: email,
      subject: 'Payment confirmed! Your Potion trial is now active',
      html: `
        <h1>Payment Confirmed, ${firstName}!</h1>
        <p>Great news! Your payment has been processed successfully.</p>
        <p>Your 7-day trial is now active. Check your email for password setup instructions.</p>
      `,
    });
  }
};

const sendAsyncPaymentFailedEmail = async (
  email: string,
  firstName: string,
) => {
  try {
    const props: AsyncPaymentFailedProps = {
      firstName,
      checkoutUrl: `${config.frontURL}/checkout`,
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'async-payment-failed',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending async payment failed email:', error);

    // Fallback
    return sendEmail({
      to: email,
      subject: 'Payment issue with your Potion signup',
      html: `
        <h1>Hi ${firstName},</h1>
        <p>We had trouble processing your payment for Potion.</p>
        <p>Please try again or contact your bank if the issue persists:</p>
        <a href="${config.frontURL}/checkout">Try Again</a>
      `,
    });
  }
};

const sendSubscriptionCancelledEmail = async (
  email: string,
  firstName: string,
) => {
  try {
    const props: SubscriptionCancelledProps = {
      firstName,
      // endDate: can be added when we have the exact end date
      feedbackUrl: `${config.frontURL}/feedback`,
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'subscription-cancelled',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending subscription cancelled email:', error);

    // Fallback
    return sendEmail({
      to: email,
      subject: 'Your Potion subscription has been cancelled',
      html: `
        <h1>Sorry to see you go, ${firstName}</h1>
        <p>Your Potion subscription has been cancelled.</p>
        <p>You'll continue to have access until your current billing period ends.</p>
        <p>We'd love to have you back anytime!</p>
      `,
    });
  }
};

const sendSubscriptionPausedEmail = async (
  email: string,
  firstName: string,
) => {
  try {
    const props: SubscriptionPausedProps = {
      firstName,
      resumeUrl: `${config.frontURL}/billing`,
      manageBillingUrl: `${config.frontURL}/profile/settings`,
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'subscription-paused',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending subscription paused email:', error);

    // Fallback
    return sendEmail({
      to: email,
      subject: 'Your Potion subscription has been paused',
      html: `
        <h1>Hi ${firstName},</h1>
        <p>Your Potion subscription has been paused.</p>
        <p>You can resume your subscription anytime from your billing settings.</p>
        <a href="${config.frontURL}/profile/settings">Manage Subscription</a>
      `,
    });
  }
};

const sendSubscriptionResumedEmail = async (
  email: string,
  firstName: string,
) => {
  try {
    const props: SubscriptionResumedProps = {
      firstName,
      dashboardUrl: `${config.frontURL}/dashboard`,
      billingUrl: `${config.frontURL}/profile/settings`,
    };

    const { subject, html } = await reactEmailService.renderTemplate(
      'subscription-resumed',
      props,
    );

    return sendEmail({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error sending subscription resumed email:', error);

    // Fallback
    return sendEmail({
      to: email,
      subject: 'Welcome back! Your Potion subscription has been resumed',
      html: `
        <h1>Welcome back, ${firstName}!</h1>
        <p>Great news! Your Potion subscription has been resumed and is now active.</p>
        <p>You now have full access to all premium features again.</p>
        <a href="${config.frontURL}/dashboard">Go to Dashboard</a>
      `,
    });
  }
};
