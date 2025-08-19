import { plaidClient } from '../config/plaid';
import { PlaidItem } from '../models/PlaidItem';
import { predictCategory, Transaction } from '../models/Transaction';
import { Types } from 'mongoose';
import { CountryCode, LinkTokenCreateRequest, Products } from 'plaid';
import { BalanceCalculationService } from './balanceCalculationService';
import { myEmitter } from './eventEmitter';

enum PlaidWebhookCode {
  'userPermissionRevoked' = 'USER_PERMISSION_REVOKED',
  'initialUpdate' = 'INITIAL_UPDATE',
  'historicalUpdate' = 'HISTORICAL_UPDATE',
  'defaultUpdate' = 'DEFAULT_UPDATE',
  'syncUpdatesAvailable' = 'SYNC_UPDATES_AVAILABLE',
}
export class PlaidService {
  static async createLinkToken(userId: string, existingToken?: string) {
    try {
      const configs: LinkTokenCreateRequest = {
        user: {
          client_user_id: userId,
        },
        client_name: 'Potion Finance',
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: 'en',
        webhook: `${process.env.API_URL}api/plaid/webhook`,
        transactions: {
          days_requested: 730,
        },
        update: {
          account_selection_enabled: !!existingToken,
        },
        access_token: existingToken ? existingToken : undefined,
      };

      const response = await plaidClient.linkTokenCreate(configs);
      return response.data;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  }

  static async removeItem(access_token: string) {
    try {
      const response = await plaidClient.itemRemove({
        access_token,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  }

  static async exchangePublicToken(publicToken: string, userId: string) {
    try {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const { access_token, item_id } = response.data;

      // Get institution info
      const itemResponse = await plaidClient.itemGet({
        access_token: access_token,
      });

      const institutionResponse = await plaidClient.institutionsGetById({
        institution_id: itemResponse.data.item.institution_id,
        country_codes: [CountryCode.Us],
      });

      // Get accounts
      const accountsResponse = await plaidClient.accountsGet({
        access_token: access_token,
      });

      // Create or update PlaidItem
      const plaidItem = await PlaidItem.findOneAndUpdate(
        { itemId: item_id },
        {
          userId: new Types.ObjectId(userId),
          accessToken: access_token,
          itemId: item_id,
          institutionId: itemResponse.data.item.institution_id,
          institutionName: institutionResponse.data.institution.name,
          accounts: accountsResponse.data.accounts.map((account) => ({
            accountId: account.account_id,
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            institutionId: itemResponse.data.item.institution_id,
            institutionName: institutionResponse.data.institution.name,
          })),
        },
        { upsert: true, new: true },
      );

      // Sync transactions immediately after linking account
      const transactionCount = await PlaidService.syncTransactions(
        plaidItem._id.toString(),
      );

      return {
        ...plaidItem.toObject(),
        newTransactionsCount: transactionCount,
      };
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw error;
    }
  }

  static async syncTransactions(plaidItemId: string) {
    try {
      const plaidItem = await PlaidItem.findById(plaidItemId);
      if (!plaidItem) {
        throw new Error('Plaid item not found');
      }

      let hasMore = true;
      let createdCount = 0;
      let cursor = plaidItem.transactionsCursor;
      let preservedCursor = cursor; // Keep track of the last successful cursor

      while (hasMore) {
        try {
          // Make the sync request
          const response = await plaidClient.transactionsSync({
            access_token: plaidItem.accessToken,
            cursor: cursor,
            options: {
              include_personal_finance_category: true,
            },
          });

          const { added, modified, removed, next_cursor, has_more } =
            response.data;

          const accountMap = {};
          response.data.accounts.forEach((account) => {
            accountMap[account.account_id] = account;
          });

          // Process added transactions
          for (const plaidTransaction of added) {
            const transaction = {
              date: new Date(plaidTransaction.date),
              type: classifyTransaction(plaidTransaction),
              amount: Math.abs(plaidTransaction.amount),
              description: plaidTransaction.name,
              bankAccount: plaidTransaction.account_id,
              cardLastFour: accountMap[plaidTransaction.account_id]?.mask || '',
              account: JSON.stringify(accountMap[plaidTransaction.account_id]),
              counterparty:
                plaidTransaction.merchant_name || plaidTransaction.name,
              category: '',
              createdBy: plaidItem.userId,
              plaidTransactionId: plaidTransaction.transaction_id,
            };

            const newTransaction = await Transaction.create(transaction);
            myEmitter.emit('databaseChange', {
              eventType: "save",
              collectionName: 'transactions',
              documentId: newTransaction._id,
              userId: newTransaction.createdBy,
            });
            setImmediate(async () => {
              try {
                await predictCategory(newTransaction);

                // Emit another update after categorization completes
                setTimeout(() => {
                  myEmitter.emit('databaseChange', {
                    eventType: 'update',
                    collectionName: 'transactions',
                    documentId: newTransaction._id,
                    userId: newTransaction.createdBy,
                  });
                }, 1000); // Reduced to 1 second for faster feedback
              } catch (error) {
                console.error('Background categorization failed:', error);
              }
            });
            createdCount++;
          }

          // Process modified transactions
          for (const plaidTransaction of modified) {
            const updatedTransaction = await Transaction.findOneAndUpdate(
              { plaidTransactionId: plaidTransaction.transaction_id },
              {
                amount: Math.abs(plaidTransaction.amount),
                description: plaidTransaction.name,
                counterparty:
                  plaidTransaction.merchant_name || plaidTransaction.name,
                category: '',
              },
            );

            predictCategory(updatedTransaction);
          }

          // Process removed transactions
          for (const removedTransaction of removed) {
            await Transaction.deleteOne({
              plaidTransactionId: removedTransaction.transaction_id,
            });
          }

          // Update cursor and hasMore flag
          cursor = next_cursor;
          hasMore = has_more;

          // If this sync was successful, update the preserved cursor
          preservedCursor = cursor;

          // Update the cursor in the database after each successful sync
          await PlaidItem.findByIdAndUpdate(plaidItemId, {
            transactionsCursor: cursor,
            lastSync: new Date(),
          });
        } catch (error: any) {
          if (
            error.response?.data?.error_code ===
            'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION'
          ) {
            console.log(
              '[PlaidService] Mutation detected during pagination, restarting from preserved cursor',
            );
            cursor = preservedCursor;
            continue;
          }
          throw error;
        }
      }

      // Update balances after transaction sync
      try {
        await BalanceCalculationService.updateBalancesAfterSync(
          plaidItem.userId.toString(),
          plaidItemId,
        );
      } catch (error) {
        console.error(
          `[PlaidService] Error updating balances after sync:`,
          error,
        );
        // Don't fail the sync if balance calculation fails
      }

      return createdCount;
    } catch (error) {
      console.error('Error syncing transactions:', error);
      throw error;
    }
  }

  static async deletePlaidItem(itemId: string) {
    try {
      let plaidItem = await PlaidItem.findOne({
        itemId,
      });

      if (!plaidItem) {
        return;
      }

      plaidItem.accounts?.map(async (account) => {
        await Transaction.deleteMany({ bankAccount: account.accountId });
      });

      await PlaidService.removeItem(plaidItem.accessToken);
      await PlaidItem.deleteOne({ _id: plaidItem._id });
    } catch (error: any) {
      console.error('[PlaidService] Error deleting Plaid item:', error.message);
      throw error;
    }
  }

  static async handleWebhook(webhookData: any) {
    try {
      const { webhook_type, webhook_code, item_id } = webhookData;

      if (webhook_type === 'ITEM') {
        if (webhook_code === PlaidWebhookCode.userPermissionRevoked) {
          this.deletePlaidItem(item_id);
        }
      }

      if (webhook_type === 'TRANSACTIONS') {
        const plaidItem = await PlaidItem.findOne({ itemId: item_id });
        if (!plaidItem) {
          console.error(`Plaid item not found for item_id: ${item_id}`);
          throw new Error('Plaid item not found');
        }

        // Handle all types of transaction updates
        const validUpdateCodes = [
          'INITIAL_UPDATE',
          'HISTORICAL_UPDATE',
          'DEFAULT_UPDATE',
          'SYNC_UPDATES_AVAILABLE',
          'TRANSACTIONS_REMOVED',
        ];

        if (validUpdateCodes.includes(webhook_code)) {
          await this.syncTransactions(plaidItem._id.toString());
        } else {
          console.log(`Ignoring unhandled webhook code: ${webhook_code}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }
}

function classifyTransaction(txn) {
  if (txn.amount < 0) {
    return 'Income';
  }

  const incomeKeywords = ['deposit', 'payroll', 'refund', 'cashback', 'rebate'];
  const nameLower = txn.name?.toLowerCase() || '';
  const categoryLower = (txn.category || []).join(',').toLowerCase();

  if (
    incomeKeywords.some(
      (keyword) =>
        nameLower.includes(keyword) || categoryLower.includes(keyword),
    )
  ) {
    return 'Income';
  }

  return 'Expense';
}
