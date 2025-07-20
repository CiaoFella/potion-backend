import cron from 'node-cron';
import { User } from '../models/User';
import { retrieveSubscription } from '../services/stripeService';

/**
 * Update subscription status for all users with an active Stripe subscription
 */
async function updateSubscriptionStatuses() {
  try {
    // Find users with an existing Stripe subscription
    const users = await User.find({
      'subscription.stripeSubscriptionId': { $exists: true, $ne: null },
    });

    console.log(
      `Starting subscription status update for ${users.length} users`,
    );

    // Process each user's subscription
    for (const user of users) {
      try {
        // Skip if no Stripe subscription ID
        if (!user.subscription?.stripeSubscriptionId) continue;

        // Retrieve the latest subscription details from Stripe
        const subscription = await retrieveSubscription(
          user.subscription.stripeSubscriptionId,
        );

        // Update local subscription data
        user.subscription.status = subscription.status;
        user.subscription.currentPeriodEnd = new Date(
          subscription.current_period_end * 1000,
        );

        // Update trial end date if applicable
        if (subscription.trial_end) {
          user.subscription.trialEndsAt = new Date(
            subscription.trial_end * 1000,
          );
        }

        // Save the updated user
        await user.save();

        console.log(`Updated subscription for user ${user._id}`);
      } catch (userError) {
        console.error(
          `Error updating subscription for user ${user._id}:`,
          userError,
        );
        // Continue processing other users even if one fails
      }
    }

    console.log('Subscription status update completed');
  } catch (error) {
    console.error('Error in subscription status update:', error);
  }
}

/**
 * Initialize the cron job for daily subscription status updates
 */
export function initSubscriptionStatusCron() {
  // Run at midnight every day
  cron.schedule('0 0 * * *', async () => {
    await updateSubscriptionStatuses();
  });

  console.log('Subscription status update cron job initialized');
}

// Export for use in your main application setup
export default initSubscriptionStatusCron;
