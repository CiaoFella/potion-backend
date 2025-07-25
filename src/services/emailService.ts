import { Resend } from 'resend';
import { config } from '../config/config';

// Add debugging to check configuration
console.log('\n📧 Email Service Configuration:', {
  hasResendApiKey: !!config.resendApiKey,
  resendApiKeyLength: config.resendApiKey?.length || 0,
  resendApiKeyPreview: config.resendApiKey
    ? `${config.resendApiKey.substring(0, 8)}...`
    : 'None',
  emailFrom: config.emailFrom,
  hasEmailFrom: !!config.emailFrom,
  nodeEnv: process.env.NODE_ENV,
});

const resend = new Resend(config.resendApiKey);

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    console.log('\n🔄 [EMAIL DEBUG] Attempting to send email:', {
      to: options.to,
      subject: options.subject,
      hasHtml: !!options.html,
      hasText: !!options.text,
      from: config.emailFrom,
      timestamp: new Date().toISOString(),
    });

    console.log('[EMAIL DEBUG] 📤 Calling Resend API...');
    const result = await resend.emails.send({
      from: config.emailFrom,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('[EMAIL DEBUG] ✅ Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('\n[EMAIL DEBUG] ❌ Error sending email:', {
      to: options.to,
      subject: options.subject,
      error: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw new Error(
      `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
