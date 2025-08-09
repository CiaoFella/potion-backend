import axios from 'axios';
import { CRMItem } from '../models/CRMItem';
import { generateTokens } from '../controllers/authController';
// Use AI Service URL for CRM actions
const API_URL =
  process.env.CHAT_SERVICE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://ai.potionapp.com/api/quick-actions/'
    : 'http://localhost:5001/api/quick-actions/');

export async function getToken(userId) {
  const tokens = generateTokens(userId);

  if (!tokens.accessToken) {
    throw new Error('Token not found');
  }

  return tokens.accessToken;
}

async function updateEmptyCRMActions() {
  try {
    // Find all CRM items with empty action field
    const crmItemsWithEmptyAction = await CRMItem.find({
      // action: { $in: ['', null, 'No action'] },
      deleted: false,
    });

    console.log(
      `Found ${crmItemsWithEmptyAction.length} CRM items with empty actions`,
    );

    // Process each CRM item
    for (const item of crmItemsWithEmptyAction) {
      try {
        console.log(`Getting action for CRM item ${item._id}`);
        // Make API call to get action
        const token = await getToken(item.createdBy.toString());
        const response = await axios.get(API_URL + item._id, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(response.data[0]);

        // Update CRM item with the new action
        await CRMItem.findByIdAndUpdate(item._id, {
          action: response.data[0], // Assuming the API returns an object with an action field
        });

        console.log(`Updated CRM item ${item._id} with new action`);
      } catch (itemError) {
        console.error(`Error processing CRM item ${item._id}:`, itemError);
        // Continue with next item even if one fails
        continue;
      }
    }
  } catch (error) {
    console.error('Error in updateEmptyCRMActions:', error);
  }
}

// Run at 12 AM (0:00) and 12 PM (12:00) every day
// cron.schedule('0 0,12 * * *', async () => {
//     console.log('Starting CRM action update job');
//     await updateEmptyCRMActions();
//     console.log('Completed CRM action update job');
// });

// Export for potential manual triggering or testing
export { updateEmptyCRMActions };
