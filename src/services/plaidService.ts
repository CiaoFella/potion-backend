import { plaidClient } from "../config/plaid";
import { PlaidItem } from "../models/PlaidItem";
import { Transaction } from "../models/Transaction";
import { Types } from "mongoose";
import { CountryCode, LinkTokenCreateRequest, Products } from "plaid";
import { BalanceCalculationService } from "./balanceCalculationService";

export class PlaidService {
  static async createLinkToken(userId: string, existingToken?: string) {
    try {
      const configs: LinkTokenCreateRequest = {
        user: {
          client_user_id: userId,
        },
        client_name: "Potion Finance",
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: "en",
        webhook: `${process.env.API_URL}api/plaid/webhook`,
        transactions: {
          days_requested: 700,
        },
        access_token: existingToken ? existingToken : undefined,
      };

      const response = await plaidClient.linkTokenCreate(configs);
      return response.data;
    } catch (error) {
      console.error("Error creating link token:", error);
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
        { upsert: true, new: true }
      );

      // Sync transactions immediately after linking account
      await PlaidService.syncTransactions(plaidItem._id.toString());

      return plaidItem;
    } catch (error) {
      console.error("Error exchanging public token:", error);
      throw error;
    }
  }

  static async syncTransactions(plaidItemId: string) {
    try {
      const plaidItem = await PlaidItem.findById(plaidItemId);
      if (!plaidItem) {
        throw new Error("Plaid item not found");
      }

      console.log(
        `[PlaidService] Syncing transactions for plaidItem: ${plaidItemId}, userId: ${plaidItem.userId}`
      );

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

          console.log(
            `[PlaidService] Sync response - Added: ${added.length}, Modified: ${modified.length}, Removed: ${removed.length}`
          );

          // Process added transactions
          for (const plaidTransaction of added) {
            const transaction = {
              date: new Date(plaidTransaction.date),
              type: classifyTransaction(plaidTransaction),
              amount: Math.abs(plaidTransaction.amount),
              description: plaidTransaction.name,
              bankAccount: plaidTransaction.account_id,
              cardLastFour: accountMap[plaidTransaction.account_id]?.mask || "",
              account: JSON.stringify(accountMap[plaidTransaction.account_id]),
              counterparty:
                plaidTransaction.merchant_name || plaidTransaction.name,
              category:
                plaidTransaction.personal_finance_category?.primary || "",
              createdBy: plaidItem.userId,
              plaidTransactionId: plaidTransaction.transaction_id,
            };

            await Transaction.create(transaction);
            createdCount++;
          }

          // Process modified transactions
          for (const plaidTransaction of modified) {
            await Transaction.findOneAndUpdate(
              { plaidTransactionId: plaidTransaction.transaction_id },
              {
                amount: Math.abs(plaidTransaction.amount),
                description: plaidTransaction.name,
                counterparty:
                  plaidTransaction.merchant_name || plaidTransaction.name,
                category:
                  plaidTransaction.personal_finance_category?.primary || "",
              }
            );
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
            "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION"
          ) {
            console.log(
              "[PlaidService] Mutation detected during pagination, restarting from preserved cursor"
            );
            cursor = preservedCursor;
            continue;
          }
          throw error;
        }
      }

      console.log(
        `[PlaidService] Created ${createdCount} new transactions for userId: ${plaidItem.userId}`
      );

      // Update balances after transaction sync
      try {
        await BalanceCalculationService.updateBalancesAfterSync(
          plaidItem.userId.toString(),
          plaidItemId
        );
        console.log(`[PlaidService] Balance calculation completed after sync`);
      } catch (error) {
        console.error(
          `[PlaidService] Error updating balances after sync:`,
          error
        );
        // Don't fail the sync if balance calculation fails
      }

      return createdCount;
    } catch (error) {
      console.error("Error syncing transactions:", error);
      throw error;
    }
  }

  static async handleWebhook(webhookData: any) {
    try {
      const { webhook_type, webhook_code, item_id } = webhookData;
      console.log(`Received webhook: ${webhookData}`);

      if (webhook_type === "TRANSACTIONS") {
        const plaidItem = await PlaidItem.findOne({ itemId: item_id });
        if (!plaidItem) {
          console.error(`Plaid item not found for item_id: ${item_id}`);
          throw new Error("Plaid item not found");
        }

        // Handle all types of transaction updates
        const validUpdateCodes = [
          "INITIAL_UPDATE",
          "HISTORICAL_UPDATE",
          "DEFAULT_UPDATE",
          "SYNC_UPDATES_AVAILABLE",
        ];

        if (validUpdateCodes.includes(webhook_code)) {
          console.log(`Processing ${webhook_code} for item_id: ${item_id}`);
          // Sync new transactions
          await this.syncTransactions(plaidItem._id.toString());
          console.log(
            `Successfully synced transactions for item_id: ${item_id}`
          );
        } else {
          console.log(`Ignoring unhandled webhook code: ${webhook_code}`);
        }
      }

      return true;
    } catch (error) {
      console.error("Error handling webhook:", error);
      throw error;
    }
  }
}

function classifyTransaction(txn) {
  if (txn.amount < 0) {
    return "Income";
  }

  const incomeKeywords = ["deposit", "payroll", "refund", "cashback", "rebate"];
  const nameLower = txn.name?.toLowerCase() || "";
  const categoryLower = (txn.category || []).join(",").toLowerCase();

  if (
    incomeKeywords.some(
      (keyword) =>
        nameLower.includes(keyword) || categoryLower.includes(keyword)
    )
  ) {
    return "Income";
  }

  return "Expense";
}
