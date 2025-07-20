import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, alerts, special } from './_styles/shared';

export interface AsyncPaymentFailedProps {
  firstName: string;
  checkoutUrl?: string;
}

export const subject = 'Payment issue with your Potion signup';

const AsyncPaymentFailedEmail: React.FC<AsyncPaymentFailedProps> = ({
  firstName,
  checkoutUrl = 'https://app.potionapp.com/checkout',
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, we had trouble processing your payment for Potion.`}
      headerTitle="⚠️ Payment Issue"
      headerStyle={special.errorHeader}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <div style={alerts.error}>⚠️ We had trouble processing your payment for Potion.</div>

      <Text style={components.text}>
        Your bank or payment provider may have declined the payment. This can happen for various
        reasons:
      </Text>

      <div>
        <Text style={components.featureItem}>• Insufficient funds in your account</Text>
        <Text style={components.featureItem}>• Your bank flagged it as suspicious activity</Text>
        <Text style={components.featureItem}>• Payment method expired or invalid</Text>
        <Text style={components.featureItem}>• Processing delay from your bank</Text>
      </div>

      <Text style={components.text}>
        <strong>Next steps:</strong>
      </Text>

      <Text style={components.text}>
        Please try again or contact your bank if the issue persists. You can also try using a
        different payment method.
      </Text>

      <Section style={components.buttonSection}>
        <Button href={checkoutUrl} style={components.button}>
          Try Again
        </Button>
      </Section>

      <Text style={components.text}>
        <strong>Need help?</strong> Our support team is here to assist:
      </Text>

      <div>
        <Text style={components.featureItem}>
          📧 Email us at{' '}
          <a href="mailto:support@potionapp.com" style={components.link}>
            support@potionapp.com
          </a>
        </Text>
        <Text style={components.featureItem}>
          💬 We typically respond within 2 hours during business hours
        </Text>
      </div>

      <Text style={components.smallText}>
        We're here to help you get started with Potion as quickly as possible!
      </Text>
    </Layout>
  );
};

export default AsyncPaymentFailedEmail;
