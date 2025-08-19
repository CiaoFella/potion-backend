import mongoose from 'mongoose';
import { myEmitter } from '../services/eventEmitter';
import fetch from 'node-fetch';
import { getToken } from '../cron/getCRMAction';

const TransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Expense', 'Income'],
      required: true,
    },
    bankAccount: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: false,
    },
    isUserConfirmed: {
      type: Boolean,
      required: false,
      default: false,
    },
    isExcluded: {
      type: Boolean,
      required: false,
      default: false,
    },
    counterparty: {
      type: String,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
    },
    aiDescription: {
      type: String,
    },
    category: {
      type: String,
      required: false,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cardLastFour: {
      type: String,
      required: false,
    },
    account: {
      type: String,
    },
    plaidTransactionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    action: {
      type: String,
      enum: ['CategoryAction', 'TransactionAction', 'InvoiceAction'],
    },
  },
  {
    timestamps: true,
  },
);

TransactionSchema.index({ createdBy: 1, date: -1 });
TransactionSchema.index({ plaidTransactionId: 1 });

export const predictCategory = async (doc) => {
  try {
    if (doc?.category && doc.category !== aiCategoryPlaceholder) {
      return;
    }

    const token = await getToken(doc.createdBy.toString());

    if (!token) {
      return;
    }

    // Use AI service for transaction categorization with Perplexity
    const aiServiceUrl =
      process.env.AI_SERVICE_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://ai.potionapp.com'
        : 'http://localhost:5001');

    const url = `${aiServiceUrl}/api/transaction/categorize/${doc._id.toString()}?type=category`;

    const requestBody = {
      amount: doc.amount,
      description: doc.description || '',
      merchant: doc.counterparty || '',
      date: doc.date.toISOString(),
      transactionType: doc.type || 'Expense',
    };

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Invalid response from AI service');
    }

    const prediction = result.data;

    // Find the category with highest confidence
    const bestCategory = prediction.categories?.reduce((prev, current) =>
      prev.confidence > current.confidence ? prev : current,
    );

    // Update category if confidence is high enough (lowered threshold for Perplexity)
    if (bestCategory && bestCategory.confidence >= 0.6) {
      await Transaction.findByIdAndUpdate(doc._id.toString(), {
        category: bestCategory.label,
        aiDescription: prediction.description,
      });
    } else {
      await Transaction.findByIdAndUpdate(doc._id.toString(), {
        category: null,
        aiDescription: null,
        action: 'CategoryAction',
      });
    }
  } catch (error) {
    console.error('❌ Error predicting category with Perplexity:', {
      transactionId: doc._id?.toString(),
      error: error.message,
    });

    try {
      await Transaction.findByIdAndUpdate(doc._id.toString(), {
        category: null, // Clear the "AI Processing..." state
        aiDescription: error.message,
        action: 'CategoryAction',
      });
    } catch (updateError) {
      console.error(
        'Failed to clear processing state and mark transaction for manual categorization:',
        updateError,
      );
    }
  }
};

export const aiCategoryPlaceholder = 'AI Processing...';

const actionHandler = async (doc, type = 'update') => {
  // For new transactions, set initial AI processing state
  if (type === 'save' && !doc.category) {
    try {
      // Set initial AI processing state
      await Transaction.findByIdAndUpdate(doc._id, {
        category: aiCategoryPlaceholder,
        aiDescription:
          'AI is analyzing this transaction to suggest the best category.',
      });
    } catch (error) {
      console.error('Failed to set AI processing state:', error);
    }
  }

  // Emit database change event for UI responsiveness
  myEmitter.emit('databaseChange', {
    eventType: type,
    collectionName: 'transactions',
    documentId: doc._id,
    userId: doc.createdBy,
  });

  // For new transactions, predict category asynchronously
  if (type === 'save') {
    // Run categorization in background to avoid blocking the response
    setImmediate(async () => {
      try {
        await predictCategory(doc);

        // Emit another update after categorization completes
        setTimeout(() => {
          myEmitter.emit('databaseChange', {
            eventType: 'update',
            collectionName: 'transactions',
            documentId: doc._id,
            userId: doc.createdBy,
          });
        }, 1000); // Reduced to 1 second for faster feedback
      } catch (error) {
        console.error('Background categorization failed:', error);
      }
    });
  }
};

TransactionSchema.post('save', (doc) => actionHandler(doc, 'save'));
TransactionSchema.post('updateOne', actionHandler);
TransactionSchema.post('findOneAndUpdate', actionHandler);

// Ensure categorization runs for bulk inserts as well
TransactionSchema.post('insertMany', async function (docs: any[]) {
  try {
    if (!Array.isArray(docs)) return;

    // Filter transactions that need AI processing (no existing category)
    const transactionsNeedingAI = docs.filter((d) => !d.category);

    // Set initial AI processing state for transactions that need it
    if (transactionsNeedingAI.length > 0) {
      try {
        await Promise.allSettled(
          transactionsNeedingAI.map(async (d) => {
            try {
              await Transaction.findByIdAndUpdate(d._id, {
                category: aiCategoryPlaceholder,
                aiDescription:
                  'AI is analyzing this transaction to suggest the best category.',
              });
            } catch (error) {
              console.error(
                'Failed to set AI processing state for bulk transaction:',
                error,
              );
            }
          }),
        );
      } catch (error) {
        console.error('Failed to set bulk AI processing states:', error);
      }
    }

    // Emit immediate WebSocket events so UI updates quickly with processing state
    for (const d of docs) {
      try {
        myEmitter.emit('databaseChange', {
          eventType: 'save',
          collectionName: 'transactions',
          documentId: d._id,
          userId: d.createdBy,
        });
      } catch (e) {
        console.error('WebSocket emit failed for doc', d?._id?.toString(), e);
      }
    }

    // Process categorization asynchronously in background for transactions that need it
    if (transactionsNeedingAI.length > 0) {
      setImmediate(async () => {
        // Emit another update after categorizations complete to refresh UI with actual categories
        setTimeout(() => {
          for (const d of transactionsNeedingAI) {
            try {
              myEmitter.emit('databaseChange', {
                eventType: 'update',
                collectionName: 'transactions',
                documentId: d._id,
                userId: d.createdBy,
              });
            } catch (e) {
              console.error(
                'Second WebSocket emit failed for doc',
                d?._id?.toString(),
                e,
              );
            }
          }
        }, 3000); // Wait 3 seconds for categorizations to complete
      });
    }
  } catch (err) {
    console.error('insertMany post-hook error', err);
  }
});

export const Transaction = mongoose.model('Transaction', TransactionSchema);
