import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import { WarningIcon, BulletIcon } from './_components/Icons';

export interface PaymentFailedProps {
  firstName: string;
  billingUrl?: string;
  gracePeriod?: string;
}

export const subject = 'Action needed - Update your payment method';

const PaymentFailedEmail: React.FC<PaymentFailedProps> = ({
  firstName,
  billingUrl = 'https://app.potionapp.com/billing',
  gracePeriod = '7 days',
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, we need to fix a payment issue with your Potion subscription.`}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <Text style={components.text}>
        We couldn't process your payment for your Potion subscription.
      </Text>

      <div style={statusBoxes.warning}>
        <WarningIcon size={16} color="#d97706" />
        <strong>Action required:</strong> Please update your payment method to
        continue your service.
      </div>

      <Text style={components.text}>
        <strong>Don't worry - your account is still active for now.</strong>
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
          Update Payment Method
        </Button>
      </Section>

      <Text style={components.text}>
        To keep your Potion account active, please update your payment
        information within <strong>{gracePeriod}</strong>.
      </Text>

      <Text style={components.smallText}>
        <strong>Need help?</strong> Our support team is available to assist you
        - just reply to this email.
      </Text>
    </Layout>
  );
};

export default PaymentFailedEmail;
