import express from 'express';
import axios from 'axios';
import { auth } from '../middleware/auth';

const router = express.Router();

// AI Service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

/**
 * Proxy middleware to forward requests to AI service
 */
const proxyToAIService = (path: string) => {
  return async (req: any, res: any) => {
    try {
      // Forward the request to AI service with JWT token
      const response = await axios({
        method: req.method,
        url: `${AI_SERVICE_URL}${path}`,
        data: req.body,
        headers: {
          Authorization: req.headers.authorization,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 seconds for AI processing
      });

      // Forward the response back to client
      res.status(response.status).json(response.data);
    } catch (error: any) {
      console.error('AI service proxy error:', {
        path,
        error: error.response?.data || error.message,
        status: error.response?.status || 500,
        userId: req.user?.id,
      });

      // Forward error response or create generic error
      if (error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(503).json({
          success: false,
          error: {
            message: 'AI service unavailable',
            code: 'AI_SERVICE_UNAVAILABLE',
          },
        });
      }
    }
  };
};

// Chat completion endpoint
router.post('/chat', auth, proxyToAIService('/api/chat'));

// Document generation endpoint
router.post(
  '/chat/generate-document',
  auth,
  proxyToAIService('/api/chat/generate-document'),
);

// AI service health check
router.get('/chat/health', auth, proxyToAIService('/api/chat/health'));

// Available AI models
router.get('/chat/models', auth, proxyToAIService('/api/chat/models'));

// Transaction categorization endpoints
router.post('/transaction/categorize/:transactionId', auth, (req, res) => {
  const { transactionId } = req.params;
  const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
  const path = `/api/transaction/categorize/${transactionId}${queryString ? '?' + queryString : ''}`;
  return proxyToAIService(path)(req, res);
});

// Transaction chat history endpoint
router.get('/transaction/chat-history/:transactionId', auth, (req, res) => {
  const { transactionId } = req.params;
  return proxyToAIService(`/api/transaction/chat-history/${transactionId}`)(
    req,
    res,
  );
});

// Chat sessions endpoints
router.get('/chat/sessions', auth, proxyToAIService('/api/chat/sessions'));
router.get('/chat/sessions/:sessionId', auth, (req, res) => {
  const { sessionId } = req.params;
  return proxyToAIService(`/api/chat/sessions/${sessionId}`)(req, res);
});
router.delete('/chat/sessions/:sessionId', auth, (req, res) => {
  const { sessionId } = req.params;
  return proxyToAIService(`/api/chat/sessions/${sessionId}`)(req, res);
});

// AI service status (public endpoint for monitoring)
router.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, {
      timeout: 5000,
    });

    res.json({
      success: true,
      aiService: response.data,
      integration: 'active',
    });
  } catch (error: any) {
    console.warn('AI service health check failed:', error.message);

    res.status(503).json({
      success: false,
      error: {
        message: 'AI service unavailable',
        code: 'AI_SERVICE_DOWN',
      },
      integration: 'inactive',
    });
  }
});

export default router;
