import { Router, Request, Response } from 'express';
import { reactEmailService } from '../services/reactEmailService';
import type { PasswordSetupProps } from '../templates/react-email/password-setup';
import type { AsyncPaymentFailedProps } from '../templates/react-email/async-payment-failed';
import type { AsyncPaymentSuccessProps } from '../templates/react-email/async-payment-success';
import type { CheckoutAbandonedProps } from '../templates/react-email/checkout-abandoned';
import type { TrialEndingProps } from '../templates/react-email/trial-ending';
import type { SubscriptionCancelledProps } from '../templates/react-email/subscription-cancelled';
import type { PaymentFailedProps } from '../templates/react-email/payment-failed';
import type { EmailFallbackProps } from '../templates/react-email/email-fallback';

const router = Router();

// Development-only email preview routes
if (process.env.NODE_ENV === 'development') {
  // Password Setup Email Preview
  router.get('/emails/password-setup', async (req: Request, res: Response) => {
    try {
      const props: PasswordSetupProps = {
        firstName: 'John',
        setupUrl: 'https://app.potionapp.com/setup-password/sample-token',
        trialDays: 7,
        monthlyPrice: 29,
        tokenExpiry: '48 hours',
      };

      const { subject, html } = await reactEmailService.renderTemplate(
        'password-setup',
        props,
      );

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${subject}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
              .preview-header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .preview-header h1 { margin: 0 0 10px 0; color: #333; }
              .preview-header p { margin: 0; color: #666; font-size: 14px; }
              .email-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="preview-header">
              <h1>Email Preview: ${subject}</h1>
              <p><strong>Template:</strong> password-setup.tsx</p>
              <p><strong>Recipient:</strong> ${props.firstName}</p>
            </div>
            <div class="email-container">
              ${html}
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).json({ error: 'Failed to render email template' });
    }
  });

  // Payment Failed Email Preview
  router.get('/emails/payment-failed', async (req: Request, res: Response) => {
    try {
      const props: PaymentFailedProps = {
        firstName: 'Sarah',
        billingUrl: 'https://app.potionapp.com/billing',
        gracePeriod: '7 days',
      };

      const { subject, html } = await reactEmailService.renderTemplate(
        'payment-failed',
        props,
      );

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${subject}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
              .preview-header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .preview-header h1 { margin: 0 0 10px 0; color: #333; }
              .preview-header p { margin: 0; color: #666; font-size: 14px; }
              .email-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="preview-header">
              <h1>Email Preview: ${subject}</h1>
              <p><strong>Template:</strong> payment-failed.tsx</p>
              <p><strong>Recipient:</strong> ${props.firstName}</p>
            </div>
            <div class="email-container">
              ${html}
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).json({ error: 'Failed to render email template' });
    }
  });

  // Trial Ending Email Preview
  router.get('/emails/trial-ending', async (req: Request, res: Response) => {
    try {
      const props: TrialEndingProps = {
        firstName: 'Mike',
        daysRemaining: 3,
        trialDays: 7,
        monthlyPrice: 29,
        billingUrl: 'https://app.potionapp.com/billing',
        usageStats: true,
        projectsCreated: 5,
        invoicesSent: 12,
        tasksCompleted: 48,
        clientsAdded: 3,
      };

      const { subject, html } = await reactEmailService.renderTemplate(
        'trial-ending',
        props,
      );

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${subject}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
              .preview-header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .preview-header h1 { margin: 0 0 10px 0; color: #333; }
              .preview-header p { margin: 0; color: #666; font-size: 14px; }
              .email-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="preview-header">
              <h1>Email Preview: ${subject}</h1>
              <p><strong>Template:</strong> trial-ending.tsx</p>
              <p><strong>Recipient:</strong> ${props.firstName}</p>
            </div>
            <div class="email-container">
              ${html}
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).json({ error: 'Failed to render email template' });
    }
  });

  // Checkout Abandoned Email Preview
  router.get(
    '/emails/checkout-abandoned',
    async (req: Request, res: Response) => {
      try {
        const props: CheckoutAbandonedProps = {
          firstName: 'Emma',
          checkoutUrl: 'https://app.potionapp.com/checkout',
          urgencyText: 'This offer expires in 24 hours!',
        };

        const { subject, html } = await reactEmailService.renderTemplate(
          'checkout-abandoned',
          props,
        );

        res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${subject}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }
              .preview-header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .preview-header h1 { margin: 0 0 10px 0; color: #333; }
              .preview-header p { margin: 0; color: #666; font-size: 14px; }
              .email-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="preview-header">
                             <h1>Email Preview: ${subject}</h1>
              <p><strong>Template:</strong> checkout-abandoned.tsx</p>
              <p><strong>Recipient:</strong> ${props.firstName}</p>
            </div>
            <div class="email-container">
              ${html}
            </div>
          </body>
        </html>
      `);
      } catch (error) {
        res.status(500).json({ error: 'Failed to render email template' });
      }
    },
  );

  // Email Templates List (Index)
  router.get('/emails', (req: Request, res: Response) => {
    const templates = [
      {
        name: 'Password Setup',
        path: '/dev/emails/password-setup',
        description: 'Welcome email with password setup',
      },
      {
        name: 'Payment Failed',
        path: '/dev/emails/payment-failed',
        description: 'Payment issue notification',
      },
      {
        name: 'Trial Ending',
        path: '/dev/emails/trial-ending',
        description: 'Trial expiration reminder',
      },
      {
        name: 'Checkout Abandoned',
        path: '/dev/emails/checkout-abandoned',
        description: 'Abandoned cart recovery',
      },
    ];

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
                     <title>Email Templates Preview</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f5f5f5; 
            }
            .header { 
              background: white; 
              padding: 30px; 
              border-radius: 8px; 
              margin-bottom: 30px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
              text-align: center;
            }
            .header h1 { margin: 0 0 10px 0; color: #333; }
            .header p { margin: 0; color: #666; }
            .templates-grid { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
              gap: 20px; 
            }
            .template-card { 
              background: white; 
              padding: 20px; 
              border-radius: 8px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
              transition: transform 0.2s;
            }
            .template-card:hover { transform: translateY(-2px); }
            .template-card h3 { margin: 0 0 10px 0; color: #333; }
            .template-card p { margin: 0 0 15px 0; color: #666; font-size: 14px; }
            .preview-btn { 
              background: #1EC64C; 
              color: white; 
              padding: 8px 16px; 
              text-decoration: none; 
              border-radius: 4px; 
              font-weight: 500;
              margin-right: 8px;
            }
            .preview-btn:hover { background: #17a441; }
            .test-form {
              margin-top: 20px;
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #e5e7eb;
            }
            .test-form h4 { margin: 0 0 15px 0; color: #374151; }
            .test-form input[type="email"] {
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .send-btn {
              background: #3B82F6;
              color: white;
              padding: 8px 16px;
              border: none;
              border-radius: 4px;
              font-weight: 500;
              cursor: pointer;
              font-size: 14px;
            }
            .send-btn:hover { background: #2563EB; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Potion Email Templates</h1>
            <p>Preview your updated transactional email templates</p>
          </div>
          <div class="templates-grid">
            ${templates
              .map(
                (template) => `
              <div class="template-card">
                <h3>${template.name}</h3>
                <p>${template.description}</p>
                <a href="${template.path}" class="preview-btn" target="_blank">Preview Template</a>
                
                <div class="test-form">
                  <h4>Test Email Delivery</h4>
                  <form action="/dev/send-test-email" method="POST">
                    <input type="hidden" name="template" value="${template.path.split('/').pop()}" />
                    <input type="email" name="email" placeholder="Enter your email to receive test" required />
                    <button type="submit" class="send-btn">Send Test Email</button>
                  </form>
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        </body>
      </html>
    `);
  });

  // Test email sending endpoint
  router.post('/send-test-email', async (req: Request, res: Response) => {
    try {
      const { template, email } = req.body;

      // You can add actual email sending logic here using your emailService
      // For now, just return success
      res.json({
        success: true,
        message: `Test email for ${template} would be sent to ${email}`,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });
}

export default router;
