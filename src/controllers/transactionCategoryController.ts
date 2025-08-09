import { Transaction } from '../models/Transaction';

export const transactionCategoryController = {
  /**
   * Handle transaction categorization chat
   */
  async handleTransactionChat(req: any, res: any) {
    try {
      const { id: transactionId } = req.params;
      const { type = 'category' } = req.query;
      const { message, currentCategory } = req.body;

      // Get transaction details
      const transaction = await Transaction.findOne({
        _id: transactionId,
        createdBy: req.user?.userId,
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error:
            'Transaction not found or you do not have permission to access it',
        });
      }

      // Prepare request for AI service
      const aiServiceUrl =
        process.env.AI_SERVICE_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://ai.potionapp.com/api'
          : 'http://localhost:5001/api');

      const aiUrl = `${aiServiceUrl}/transaction/categorize/${transactionId}?type=chat`;

      const requestBody = {
        amount: transaction.amount,
        description: transaction.description || '',
        merchant: transaction.counterparty || '',
        date: transaction.date.toISOString(),
        transactionType: transaction.type || 'Expense',
        message,
        currentCategory: currentCategory || transaction.category,
        chatHistory: [], // Could be extended to store chat history
      };

      console.log('🗣️ Forwarding transaction chat to AI service:', {
        transactionId,
        type,
        hasMessage: !!message,
        currentCategory: requestBody.currentCategory,
      });

      // Forward to AI service
      const aiResponse = await fetch(aiUrl, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.authorization || '',
        },
      });

      if (!aiResponse.ok) {
        throw new Error(
          `AI service responded with status: ${aiResponse.status}`,
        );
      }

      const result = await aiResponse.json();

      console.log('💬 AI service chat response:', {
        transactionId,
        success: result.success,
        hasMessage: !!result.data?.message,
        hasSuggestions: !!result.data?.suggestions,
        hasUpdatedCategory: !!result.data?.updatedCategory,
      });

      if (!result.success) {
        throw new Error('AI service returned unsuccessful response');
      }

      // If AI suggested a category update, apply it
      if (
        result.data?.updatedCategory &&
        result.data.updatedCategory !== transaction.category
      ) {
        await Transaction.findByIdAndUpdate(transactionId, {
          category: result.data.updatedCategory,
          aiDescription: `AI suggested: ${result.data.message}`,
        });

        console.log('✅ Applied AI-suggested category update:', {
          transactionId,
          oldCategory: transaction.category,
          newCategory: result.data.updatedCategory,
        });
      }

      // Return response in expected format
      res.json({
        success: true,
        message: result.data?.message || 'AI analysis completed',
        categories: result.data?.suggestions || [],
        description: result.data?.message || '',
      });
    } catch (error: any) {
      console.error('❌ Transaction categorization chat failed:', {
        transactionId: req.params.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to process transaction categorization chat',
        details: error.message,
      });
    }
  },

  /**
   * Get chat history for a transaction (placeholder)
   */
  async getChatHistory(req: any, res: any) {
    try {
      const { id: transactionId } = req.params;

      // Verify transaction exists and user has access
      const transaction = await Transaction.findOne({
        _id: transactionId,
        createdBy: req.user?.userId,
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error:
            'Transaction not found or you do not have permission to access it',
        });
      }

      // For now, return empty chat history
      // You could extend this to store and retrieve actual chat history
      res.json({
        success: true,
        data: [],
      });
    } catch (error: any) {
      console.error('Failed to get transaction chat history:', {
        transactionId: req.params.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get chat history',
      });
    }
  },

  /**
   * Manually trigger categorization for a transaction
   */
  async manualCategorization(req: any, res: any) {
    try {
      const { id: transactionId } = req.params;

      // Get transaction details
      const transaction = await Transaction.findOne({
        _id: transactionId,
        createdBy: req.user?.userId,
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error:
            'Transaction not found or you do not have permission to access it',
        });
      }

      // Prepare request for AI service
      const aiServiceUrl =
        process.env.AI_SERVICE_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://ai.potionapp.com/api'
          : 'http://localhost:5001/api');

      const aiUrl = `${aiServiceUrl}/transaction/categorize/${transactionId}?type=category`;

      const requestBody = {
        amount: transaction.amount,
        description: transaction.description || '',
        merchant: transaction.counterparty || '',
        date: transaction.date.toISOString(),
        transactionType: transaction.type || 'Expense',
      };

      console.log('🔍 Manual categorization request:', {
        transactionId,
        merchant: requestBody.merchant,
        amount: requestBody.amount,
      });

      // Forward to AI service
      const aiResponse = await fetch(aiUrl, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.authorization || '',
        },
      });

      if (!aiResponse.ok) {
        throw new Error(
          `AI service responded with status: ${aiResponse.status}`,
        );
      }

      const result = await aiResponse.json();

      if (!result.success) {
        throw new Error('AI service returned unsuccessful response');
      }

      console.log('🎯 Manual categorization result:', {
        transactionId,
        primaryCategory: result.data?.primaryCategory,
        confidence: result.data?.confidence,
      });

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      console.error('❌ Manual categorization failed:', {
        transactionId: req.params.id,
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to categorize transaction',
        details: error.message,
      });
    }
  },
};
