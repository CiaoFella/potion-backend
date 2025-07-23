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
import { subscribeToInternalEvents } from './services/events';
import analyticsRoutes from './routes/analyticsRoutes';
import anomalyRoutes from './routes/anomalyRoutes';
import { Accountant, UserAccountantAccess } from './models/AccountantAccess';
import { auth, unifiedAuth } from './middleware/auth';
import reportsRoutes from './routes/reportsRoutes';
import devRoutes from './routes/devRoutes';

//Hooks registration
import './models/Subcontractor';
import './models/TimeTracker';
import './models/Client';
import './models/CRMCategory';
import './models/Contract';
import './models/Invoice';
import './models/Project';
import './models/Transaction';
import './models/User';
import './models/Chat';
import './models/Admin';
import './models/Client';
import './models/Files';
import './models/Contract';
import './models/Anomalies';
import './models/AccountantAccess';
import plaidRoutes from './routes/plaidRoutes';
import { generateDownloadUrl } from './middleware/download';
import { handleStripeWebhook } from './controllers/webhookController';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
let origin =
  process.env.NODE_ENV === 'DEV'
    ? [
        'https://potion-dev-api.vercel.app',
        'https://dev.go-potion.com',
        'https://dev.potionapp.com',
        'https://dev-api.potionapp.com',
        'https://backlog.go-potion.com',
        'https://potion-dev-admin.vercel.app',
        'https://potion-web-git-finhub-champ3oys-projects.vercel.app',
      ]
    : [
        'https://potionapp.com',
        'https://my.potionapp.com',
        'https://api.potionapp.com',
        'https://potion-admin.vercel.app',
        'https://potion-web-git-finhub-champ3oys-projects.vercel.app',
      ];
origin.push(
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
);

// Mount Stripe webhook BEFORE JSON parsing to preserve raw body for signature verification
app.post(
  '/api/pay/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID'],
  }),
);
const server = http.createServer(app);
initSocketIo(server, origin);

connectDB();

// Swagger options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Go Potion API',
      version: '1.0.0',
      description: 'Documentation for the Go Potion API',
    },
    servers: [{ url: config.baseURL }, { url: 'http://localhost:5000' }],
    components: {
      schemas: {
        User: mongooseToSwagger(User),
        Client: mongooseToSwagger(Client),
        Invoice: mongooseToSwagger(Invoice),
        Contract: mongooseToSwagger(Contract),
        Project: mongooseToSwagger(Project),
        Transaction: mongooseToSwagger(Transaction),
        TimeTracker: mongooseToSwagger(Project),
        PlaidItem: mongooseToSwagger(PlaidItem),
        Accountant: mongooseToSwagger(Accountant),
        UserAccountantAccess: mongooseToSwagger(UserAccountantAccess),
        // Anomalies: mongooseToSwagger(Anomalies),

        // SignUpDto: mongooseToSwagger(SignUpDto),
        // LoginDto: mongooseToSwagger(LoginDto),
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
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

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocs);
});

// Routes to protect with unified auth that supports both user and accountant tokens
app.use(
  '/api/transaction',
  unifiedAuth,
  checkSubscriptionAccess,
  transactionRoutes,
);
app.use('/api/invoice', unifiedAuth, checkSubscriptionAccess, invoiceRoutes);
app.use('/api/client', unifiedAuth, checkSubscriptionAccess, clientRoutes);
app.use('/api/project', unifiedAuth, checkSubscriptionAccess, projectRoutes);
app.use('/api/contract', unifiedAuth, checkSubscriptionAccess, contractRoutes);
app.use(
  '/api/timetracker',
  unifiedAuth,
  checkSubscriptionAccess,
  timeTrackerRoutes,
);
app.use('/api/search', unifiedAuth, checkSubscriptionAccess, searchRoute);
app.use(
  '/api/analytics',
  unifiedAuth,
  checkSubscriptionAccess,
  analyticsRoutes,
);

// Routes that continue using standard auth
app.use('/api/auth', authRoutes);
app.use('/api/crm', auth, checkSubscriptionAccess, crmRoutes);
app.use(
  '/api/subcontractor',
  auth,
  checkSubscriptionAccess,
  subcontractorRoutes,
);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/pay', stripeRoutes);
app.use('/api/chat', chatRoute);
app.use('/api/upload-file', uploadF, uploadFileController);
app.use('/api/download-file/:fileName', generateDownloadUrl);
app.use('/api/accountant', accountantRoutes);
app.use('/api/user-globals', auth, checkSubscriptionAccess, globalsRoutes);
app.use('/api/write-offs', auth, checkSubscriptionAccess, userWriteOffRoutes);
// Admin routes
app.use('/api/admin', adminRoutes);

// Add Plaid routes
app.use('/api/plaid', plaidRoutes);

// Add anomaly routes
app.use('/api/anomalies', checkSubscriptionAccess, anomalyRoutes);

// Register reports routes
app.use('/api/reports', checkSubscriptionAccess, reportsRoutes);

// Development routes (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use('/dev', devRoutes);
}

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/**
 * Initialize the cron jobs
 */
subscribeToInternalEvents();
initSubscriptionStatusCron();

// Initialize CRM action update cron job
// This cron job runs every hour (at minute 0) to update empty CRM actions
// For example: 1:00, 2:00, 3:00, etc.
cron.schedule('0 * * * *', async () => {
  await updateEmptyCRMActions();
});

// updateEmptyCRMActions()
