import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, spacing } from './_styles/shared';
import { InfoIcon, CheckIcon, SettingsIcon } from './_components/Icons';

export interface SubscriptionPausedProps {
  firstName: string;
  resumeUrl?: string;
  manageBillingUrl?: string;
}

export const subject = 'Your Potion subscription has been paused';

const SubscriptionPausedEmail: React.FC<SubscriptionPausedProps> = ({
  firstName,
  resumeUrl = 'https://my.potionapp.com/billing',
  manageBillingUrl = 'https://my.potionapp.com/profile/settings',
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, your Potion subscription has been paused. Resume anytime.`}
    >
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>Hi {firstName},</Heading>

        <div style={statusBoxes.info}>
          <InfoIcon size={16} color="#2563eb" />
          Your Potion subscription has been paused
        </div>

        <Text style={components.text}>
          Your subscription is currently paused and billing has been temporarily
          stopped.
        </Text>

        <Text style={components.text}>
          <strong>What this means:</strong>
        </Text>

        <div style={{ margin: '16px 0' }}>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>
              <CheckIcon size={14} color="#2563eb" />
            </span>
            <span>
              No charges will be made while your subscription is paused
            </span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>
              <CheckIcon size={14} color="#2563eb" />
            </span>
            <span>Your account data remains safe and secure</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>
              <SettingsIcon size={14} color="#2563eb" />
            </span>
            <span>You can resume your subscription at any time</span>
          </Text>
        </div>

        <Text style={components.text}>
          <strong>Ready to continue?</strong> You can resume your subscription
          anytime and pick up exactly where you left off.
        </Text>

        <Section style={components.buttonSection}>
          <Button href={resumeUrl} style={components.button}>
            Resume Subscription
          </Button>
        </Section>

        <Text style={components.smallText}>
          You can also{' '}
          <a href={manageBillingUrl} style={components.link}>
            manage your subscription settings
          </a>{' '}
          or contact us if you have any questions.
        </Text>

        <Text style={components.smallText}>
          We'll be here when you're ready to continue your business automation
          journey!
        </Text>
      </Section>
    </Layout>
  );
};

export default SubscriptionPausedEmail;
