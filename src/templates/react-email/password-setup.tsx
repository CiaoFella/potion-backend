import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, colors, spacing } from './_styles/shared';
import {
  CheckCircleIcon,
  BankIcon,
  AIIcon,
  ReportsIcon,
  UsersIcon,
} from './_components/Icons';

// TypeScript interface for props
export interface PasswordSetupProps {
  firstName: string;
  setupUrl: string;
  trialDays?: number;
  monthlyPrice?: number;
  tokenExpiry?: string;
}

// Subject line for the email
export const subject = 'Welcome to Potion! Set up your password to get started';

// Main template component
const PasswordSetupEmail: React.FC<PasswordSetupProps> = ({
  firstName,
  setupUrl,
  trialDays = 7,
  monthlyPrice = 29,
  tokenExpiry = '48 hours',
}) => {
  return (
    <Layout
      preview={`Welcome ${firstName}! Complete your account setup and start exploring Potion.`}
    >
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>
          Hey {firstName}, welcome to Potion! 👋
        </Heading>

        <Text style={components.text}>
          You're about to get your finances organized in a way that actually
          makes sense. No more spreadsheet headaches or guessing where your
          money went.
        </Text>

        <div style={statusBoxes.success}>
          <CheckCircleIcon size={16} color="#059669" />
          <strong>Account created!</strong> You've got {trialDays} days to try
          everything for free.
        </div>

        <Text style={components.text}>
          Set up your password and let's get started:
        </Text>

        <Section style={components.buttonSection}>
          <Button href={setupUrl} style={components.button}>
            Complete Account Setup
          </Button>
        </Section>

        <Text style={components.smallText}>
          <strong>Setup link expires in {tokenExpiry}</strong> - complete setup
          soon to start exploring.
        </Text>
      </Section>

      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <div style={{ margin: '32px 0' }}>
          <div
            style={{
              borderTop: `1px solid ${colors.border}`,
              margin: '24px 0',
            }}
          />

          <Heading style={components.sectionHeading}>
            Here's what you'll be able to do:
          </Heading>

          <FeaturesList />

          <div
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              margin: '16px 0',
            }}
          >
            <Text
              style={{
                ...components.smallText,
                margin: '0',
                fontWeight: '600',
              }}
            >
              Free for {trialDays} days, then ${monthlyPrice}/month
            </Text>
            <Text
              style={{
                ...components.smallText,
                margin: '4px 0 0 0',
                color: '#6b7280',
              }}
            >
              Cancel anytime • No setup fees • All features included
            </Text>
          </div>
        </div>

        <Text style={components.smallText}>
          <strong>Questions?</strong> Our team typically responds within 2 hours
          during business hours - just reply to this email.
        </Text>
      </Section>
    </Layout>
  );
};

// Clean features list component with icons
const FeaturesList: React.FC = () => {
  const features = [
    {
      icon: <BankIcon size={14} color="#1EC64C" />,
      text: 'Connect your bank and get all transactions automatically categorized',
    },
    {
      icon: <AIIcon size={14} color="#1EC64C" />,
      text: "Chat with AI about any transaction you're unsure about",
    },
    {
      icon: <ReportsIcon size={14} color="#1EC64C" />,
      text: 'Get profit & loss, cash flow, and balance sheet reports instantly',
    },
    {
      icon: <UsersIcon size={14} color="#1EC64C" />,
      text: 'Invite your accountant to access everything they need',
    },
  ];

  return (
    <div>
      {features.map((feature, index) => (
        <Text key={index} style={{ ...components.listItem, margin: '10px 0' }}>
          <span style={components.listItemBullet}>{feature.icon}</span>
          <span>{feature.text}</span>
        </Text>
      ))}
    </div>
  );
};

export default PasswordSetupEmail;
