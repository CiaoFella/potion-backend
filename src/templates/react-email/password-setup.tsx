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
export const subject = 'Set up your Potion password to get started';

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
      preview={`Welcome ${firstName}! Set up your password to start your ${trialDays}-day trial.`}
    >
      <Heading style={components.mainHeading}>
        Welcome to Potion, {firstName}!
      </Heading>

      <Text style={components.text}>
        Thank you for signing up! We're excited to help you automate your
        business operations.
      </Text>

      <div style={statusBoxes.success}>
        <CheckCircleIcon size={16} color="#059669" />
        <strong>Your {trialDays}-day free trial is ready</strong>
      </div>

      <Text style={components.text}>
        To get started, please set up your password by clicking the button
        below:
      </Text>

      <Section style={components.buttonSection}>
        <Button href={setupUrl} style={components.button}>
          Set Up My Password
        </Button>
      </Section>

      <Text style={components.smallText}>
        <strong>This link expires in {tokenExpiry}</strong> - set up your
        password soon to avoid delays.
      </Text>

      <div style={{ margin: '32px 0' }}>
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            margin: '24px 0',
          }}
        />

        <Heading style={components.sectionHeading}>
          What's included in your trial:
        </Heading>

        <FeaturesList />

        <Text style={components.smallText}>
          Then ${monthlyPrice}/month • Cancel anytime during your trial period
        </Text>
      </div>

      <Text style={components.text}>
        Have questions? Just reply to this email - our team responds within a
        few hours.
      </Text>
    </Layout>
  );
};

// Clean features list component with icons
const FeaturesList: React.FC = () => {
  const features = [
    {
      icon: <SettingsIcon size={14} color="#1EC64C" />,
      text: 'AI-powered business assistant and automation',
    },
    {
      icon: <FileTextIcon size={14} color="#1EC64C" />,
      text: 'Contract creation and proposal management',
    },
    {
      icon: <DollarSignIcon size={14} color="#1EC64C" />,
      text: 'Automated invoicing and payment processing',
    },
    {
      icon: <BarChartIcon size={14} color="#1EC64C" />,
      text: 'Financial analytics and reporting',
    },
  ];

  return (
    <div>
      {features.map((feature, index) => (
        <Text key={index} style={{ ...components.listItem, margin: '8px 0' }}>
          <span style={components.listItemBullet}>{feature.icon}</span>
          <span>{feature.text}</span>
        </Text>
      ))}
    </div>
  );
};

export default PasswordSetupEmail;
