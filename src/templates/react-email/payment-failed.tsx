import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, special, alerts } from './_styles/shared';

export interface PaymentFailedProps {
  firstName: string;
  billingUrl?: string;
  gracePeriod?: string;
}

export const subject = 'Action needed: Payment issue with your Potion subscription';

const PaymentFailedEmail: React.FC<PaymentFailedProps> = ({
  firstName,
  billingUrl = 'https://app.potionapp.com/billing',
  gracePeriod = '7 days',
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, we need to fix a payment issue with your Potion subscription.`}
      headerTitle="⚠️ Payment Issue"
      headerStyle={special.errorHeader}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <div style={alerts.error}>
        ⚠️ <strong>Action Required:</strong> We couldn't process your payment for your Potion
        subscription.
      </div>

      <Text style={components.text}>
        Don't worry - your account is still active for now, but we need you to update your payment
        method to continue your service.
      </Text>

      <Text style={components.text}>
        <strong>What happened?</strong>
      </Text>

      <div>
        <Text style={components.featureItem}>• Your card may have expired</Text>
        <Text style={components.featureItem}>• Your bank may have declined the payment</Text>
        <Text style={components.featureItem}>• There might be insufficient funds</Text>
        <Text style={components.featureItem}>• Your billing address may need updating</Text>
      </div>

      <Text style={components.text}>To keep your Potion account active:</Text>

      <Section style={components.buttonSection}>
        <Button href={billingUrl} style={components.button}>
          Update Payment Method
        </Button>
      </Section>

      <Text style={components.text}>
        <strong>Need help?</strong> Our team is here to assist you:
      </Text>

      <div>
        <Text style={components.featureItem}>
          📧 Email us at{' '}
          <a href="mailto:support@potionapp.com" style={components.link}>
            support@potionapp.com
          </a>
        </Text>
        <Text style={components.featureItem}>💬 Chat with us in your Potion dashboard</Text>
      </div>

      <Text style={components.smallText}>
        If you don't update your payment method within {gracePeriod}, your account may be suspended.
      </Text>
    </Layout>
  );
};

export default PaymentFailedEmail;
