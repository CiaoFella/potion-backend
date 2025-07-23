import express from 'express';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import clientRoutes from './routes/clientRoutes';
import globalsRoutes from './routes/userGlobalsRoutes';
import userWriteOffRoutes from './routes/userWriteOffRoutes';
import projectRoutes from './routes/projectRoutes';
import contractRoutes from './routes/contractRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import crmRoutes from './routes/crmRoutes';
import subcontractorRoutes from './routes/subcontractorRoutes';
import waitlistRoutes from './routes/waitlistRoutes';
import transactionRoutes from './routes/transactionRoutes';
import timeTrackerRoutes from './routes/timeTrackerRoutes';
import searchRoute from './routes/searchRoute';
import stripeRoutes from './routes/stripeRoutes';
import chatRoute from './routes/chatRoute';
import accountantRoutes from './routes/accountantRoutes';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { checkSubscriptionAccess } from './middleware/subscription';
import mongooseToSwagger from 'mongoose-to-swagger';
import { User } from './models/User';
import { Client } from './models/Client';
import { Invoice } from './models/Invoice';
import { Contract } from './models/Contract';
import { Project } from './models/Project';
import { Transaction } from './models/Transaction';
import { uploadFileController } from './controllers/uploadController';
import { PlaidItem } from './models/PlaidItem';
import cron from 'node-cron';
import initSubscriptionStatusCron from './cron/updateSubscriptionStatues';
import { updateEmptyCRMActions } from './cron/getCRMAction';
import { config } from './config/config';
import { uploadF } from './middleware/upload';
import http from 'http';
import { initSocketIo } from './services/socket';
import reportsRoutes from './routes/reportsRoutes';
import plaidRoutes from './routes/plaidRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import anomalyRoutes from './routes/anomalyRoutes';
import { auth, unifiedAuth } from './middleware/auth';
import devRoutes from './routes/devRoutes';
import {
  setupAccountantAccount,
  accountantLogin,
} from './controllers/accountantController';
import { subcontractorController } from './controllers/subcontractorController';

// Import the new RBAC middleware
import {
  rbacAuth,
  checkWritePermission,
  enforceProjectAccess,
  UserRole,
  Permission,
  requireRole,
  requirePermission,
} from './middleware/rbac';

dotenv.config();

const app = express();
const PORT = config.port || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  }),
);

// Connect to MongoDB
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Swagger setup
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Potion API',
      version: '1.0.0',
      description: 'API documentation for Potion application',
    },
    servers: [
      {
        url: config.baseURL,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: mongooseToSwagger(User),
        Client: mongooseToSwagger(Client),
        Invoice: mongooseToSwagger(Invoice),
        Contract: mongooseToSwagger(Contract),
        Project: mongooseToSwagger(Project),
        Transaction: mongooseToSwagger(Transaction),
        PlaidItem: mongooseToSwagger(PlaidItem),
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Webhook routes (no auth required)
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeRoutes,
);

// Public routes (no authentication required)
app.use('/api/auth', authRoutes); // Login, signup, password reset, etc.
app.use('/api/pay', stripeRoutes); // Stripe payment routes
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/admin', adminRoutes);

// Public external user auth routes (setup and login) - MUST be before protected routes
app.post('/api/accountant/setup-account', setupAccountantAccount);
app.post('/api/accountant/login', accountantLogin);
app.post(
  '/api/subcontractor/login',
  subcontractorController.subcontractorLogin,
);

// File upload endpoint with basic auth (will be updated for RBAC)
app.post('/api/upload', uploadF, uploadFileController);

// RBAC-protected routes with subscription check for main users
const protectedWithSubscription = [
  rbacAuth,
  checkSubscriptionAccess,
  checkWritePermission,
];

// RBAC-protected routes without subscription check (for external users)
const protectedExternal = [rbacAuth, checkWritePermission];

// Main user routes (require subscription)
app.use(
  '/api/client',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  clientRoutes,
);

app.use(
  '/api/transaction',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  transactionRoutes,
);

app.use(
  '/api/plaid',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  plaidRoutes,
);

app.use(
  '/api/analytics',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  analyticsRoutes,
);

app.use(
  '/api/anomalies',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  anomalyRoutes,
);

app.use(
  '/api/project',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT, UserRole.SUBCONTRACTOR),
  enforceProjectAccess,
  projectRoutes,
);

app.use(
  '/api/contract',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  contractRoutes,
);

app.use(
  '/api/invoice',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  invoiceRoutes,
);

app.use(
  '/api/crm',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  crmRoutes,
);

app.use(
  '/api/reports',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  reportsRoutes,
);

app.use(
  '/api/timetracker',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT, UserRole.SUBCONTRACTOR),
  timeTrackerRoutes,
);

app.use(
  '/api/chat',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  chatRoute,
);

app.use(
  '/api/search',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  searchRoute,
);

app.use(
  '/api/user-globals',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  globalsRoutes,
);

app.use(
  '/api/user-write-offs',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT),
  userWriteOffRoutes,
);

// External user routes (no subscription required)
// Note: setup-account and login are handled as public routes above
app.use(
  '/api/accountant',
  ...protectedExternal,
  requireRole(UserRole.USER, UserRole.ACCOUNTANT), // Users can manage accountants, accountants can access their own data
  accountantRoutes,
);

// Mount subcontractor routes with RBAC
app.use(
  '/api/subcontractors',
  ...protectedWithSubscription,
  requireRole(UserRole.USER, UserRole.SUBCONTRACTOR), // Allow both users and subcontractors
  subcontractorRoutes,
);

// Development routes
if (process.env.NODE_ENV === 'development') {
  app.use(
    '/api/dev',
    rbacAuth,
    requireRole(UserRole.ADMIN, UserRole.USER),
    devRoutes,
  );
}

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e: any) => e.message),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
    });
  }

  // Default error response
  res.status(500).json({
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

const server = http.createServer(app);

// Initialize Socket.IO
initSocketIo(server, config.allowedOrigins);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Documentation: ${config.baseURL}/api-docs`);

  // Initialize cron jobs
  if (process.env.NODE_ENV === 'production') {
    initSubscriptionStatusCron();
    updateEmptyCRMActions();
  }
});

export default app;
