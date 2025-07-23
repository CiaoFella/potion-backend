import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, colors } from './_styles/shared';
import {
  CheckCircleIcon,
  BulletIcon,
  SettingsIcon,
  BarChartIcon,
  FileTextIcon,
  DollarSignIcon,
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
      <Heading style={components.mainHeading}>
        Welcome to Potion, {firstName}!
      </Heading>

      <Text style={components.text}>
        Thanks for signing up! You're just one step away from transforming how
        you manage your business.
      </Text>

      <div style={statusBoxes.success}>
        <CheckCircleIcon size={16} color="#059669" />
        <strong>Account created successfully</strong> - {trialDays} days free to
        explore everything
      </div>

      <Text style={components.text}>
        Complete your account setup by creating a secure password:
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

      <div style={{ margin: '32px 0' }}>
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            margin: '24px 0',
          }}
        />

        <Heading style={components.sectionHeading}>
          Everything you need to automate your business:
        </Heading>

        <FeaturesList />

        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            margin: '16px 0',
            textAlign: 'center' as const,
          }}
        >
          <Text
            style={{ ...components.smallText, margin: '0', fontWeight: '600' }}
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
    </Layout>
  );
};

// Clean features list component with icons
const FeaturesList: React.FC = () => {
  const features = [
    {
      icon: <SettingsIcon size={14} color="#1EC64C" />,
      text: 'Smart automation that learns your business patterns',
    },
    {
      icon: <FileTextIcon size={14} color="#1EC64C" />,
      text: 'Professional contracts and proposals in minutes',
    },
    {
      icon: <DollarSignIcon size={14} color="#1EC64C" />,
      text: 'Instant invoicing with automated payment reminders',
    },
    {
      icon: <BarChartIcon size={14} color="#1EC64C" />,
      text: 'Real-time insights to grow your business faster',
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
