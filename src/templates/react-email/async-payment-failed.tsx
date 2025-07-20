import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import { WarningIcon, BulletIcon } from './_components/Icons';

export interface AsyncPaymentFailedProps {
  firstName: string;
  checkoutUrl?: string;
}

export const subject = 'Payment issue - Complete your Potion signup';

const AsyncPaymentFailedEmail: React.FC<AsyncPaymentFailedProps> = ({
  firstName,
  checkoutUrl = 'https://app.potionapp.com/checkout',
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, we had trouble processing your payment for Potion.`}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <Text style={components.text}>
        We had trouble processing your payment when you tried to sign up for
        Potion.
      </Text>

      <div style={statusBoxes.warning}>
        <WarningIcon size={16} color="#d97706" />
        <strong>Your payment couldn't be processed</strong>
      </div>

      <Text style={components.text}>This can happen for several reasons:</Text>

      <div style={{ margin: '16px 0' }}>
        <Text style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>
            <BulletIcon size={6} color="#d97706" />
          </span>
          <span>Your bank may have flagged the transaction as suspicious</span>
        </Text>
        <Text style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>
            <BulletIcon size={6} color="#d97706" />
          </span>
          <span>Insufficient funds in your account</span>
        </Text>
        <Text style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>
            <BulletIcon size={6} color="#d97706" />
          </span>
          <span>Payment method details may be incorrect or expired</span>
        </Text>
        <Text style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>
            <BulletIcon size={6} color="#d97706" />
          </span>
          <span>Temporary processing delay from your payment provider</span>
        </Text>
      </div>

      <Text style={components.text}>
        <strong>No worries - you can easily try again.</strong>
      </Text>

      <Section style={components.buttonSection}>
        <Button href={checkoutUrl} style={components.button}>
          Complete My Signup
        </Button>
      </Section>

      <Text style={components.text}>
        If you continue to experience issues, try using a different payment
        method or contact your bank.
      </Text>

      <Text style={components.smallText}>
        <strong>Need help?</strong> Our support team typically responds within 2
        hours during business hours.
      </Text>
    </Layout>
  );
};

export default AsyncPaymentFailedEmail;
