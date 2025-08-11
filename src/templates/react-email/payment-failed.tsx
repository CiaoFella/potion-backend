import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, spacing } from './_styles/shared';
import { WarningIcon, BulletIcon } from './_components/Icons';

export interface PaymentFailedProps {
  firstName: string;
  billingUrl?: string;
  gracePeriod?: string;
}

export const subject = 'Action needed - Update your payment method';

const PaymentFailedEmail: React.FC<PaymentFailedProps> = ({
  firstName,
  billingUrl = 'https://my.potionapp.com/billing',
  gracePeriod = '7 days',
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, we need to fix a payment issue with your Potion subscription.`}
    >
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>Hi {firstName},</Heading>

        <Text style={components.text}>
          We had trouble processing your payment for your Potion subscription.
          This happens sometimes - no worries!
        </Text>

        <div style={statusBoxes.info}>
          <WarningIcon size={16} color="#2563eb" />
          <strong>Quick fix needed:</strong> Update your payment method to keep
          your account active.
        </div>

        <Text style={components.text}>
          <strong>Your account remains fully active</strong> while we sort this
          out - you have {gracePeriod} to update your payment details.
        </Text>

        <Text style={components.text}>This usually happens when:</Text>

        <div style={{ margin: '16px 0' }}>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>
              <BulletIcon size={6} color="#d97706" />
            </span>
            <span>Your credit card has expired</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>
              <BulletIcon size={6} color="#d97706" />
            </span>
            <span>Your bank declined the payment</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>
              <BulletIcon size={6} color="#d97706" />
            </span>
            <span>There are insufficient funds in your account</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>
              <BulletIcon size={6} color="#d97706" />
            </span>
            <span>Your billing address needs updating</span>
          </Text>
        </div>

        <Section style={components.buttonSection}>
          <Button href={billingUrl} style={components.button}>
            Fix Payment Issue
          </Button>
        </Section>

        <Text style={components.text}>
          This usually takes less than 2 minutes to resolve. Update your payment
          information to keep everything running smoothly.
        </Text>

        <Text style={components.smallText}>
          <strong>Need help?</strong> Our support team is available to assist
          you - just reply to this email.
        </Text>
      </Section>
    </Layout>
  );
};

export default PaymentFailedEmail;
