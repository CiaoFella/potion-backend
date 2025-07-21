import React from 'react';
import { Heading, Text } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import {
  SparklesIcon,
  CheckIcon,
  SettingsIcon,
  BarChartIcon,
  FileTextIcon,
  DollarSignIcon,
  UsersIcon,
} from './_components/Icons';

export interface AsyncPaymentSuccessProps {
  firstName: string;
  trialDays?: number;
}

export const subject = 'Payment confirmed - Your Potion trial is active!';

const AsyncPaymentSuccessEmail: React.FC<AsyncPaymentSuccessProps> = ({
  firstName,
  trialDays = 7,
}) => {
  return (
    <Layout
      preview={`Payment confirmed ${firstName}! Your ${trialDays}-day Potion trial is now active.`}
    >
      <Heading style={components.mainHeading}>
        Payment confirmed, {firstName}!
      </Heading>

      <div style={statusBoxes.success}>
        <SparklesIcon size={16} color="#059669" />
        <strong>Great news!</strong> Your payment has been processed
        successfully.
      </div>

      <Text style={components.text}>
        Your {trialDays}-day free trial is now active and ready to use.
      </Text>

      <Text style={components.text}>
        If you haven't set up your password yet, check your email for setup
        instructions. Once that's done, you'll have full access to:
      </Text>

      <TrialFeatures />

      <Text style={components.text}>
        <strong>Ready to get started?</strong> Log in to your dashboard and
        start exploring all the features that will help automate your business
        operations.
      </Text>

      <Text style={components.smallText}>
        Questions about getting started? Just reply to this email - our team is
        here to help.
      </Text>
    </Layout>
  );
};

const TrialFeatures: React.FC = () => {
  const features = [
    {
      icon: <SettingsIcon size={14} color="#059669" />,
      text: 'AI-powered business assistant and automation',
    },
    {
      icon: <BarChartIcon size={14} color="#059669" />,
      text: 'Project management and task tracking',
    },
    {
      icon: <FileTextIcon size={14} color="#059669" />,
      text: 'Contract creation and proposal management',
    },
    {
      icon: <DollarSignIcon size={14} color="#059669" />,
      text: 'Automated invoicing and payment processing',
    },
    {
      icon: <UsersIcon size={14} color="#059669" />,
      text: 'CRM and client relationship management',
    },
    {
      icon: <BarChartIcon size={14} color="#059669" />,
      text: 'Financial analytics and detailed reporting',
    },
  ];

  return (
    <div style={{ margin: '16px 0' }}>
      {features.map((feature, index) => (
        <Text key={index} style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>{feature.icon}</span>
          <span>{feature.text}</span>
        </Text>
      ))}
    </div>
  );
};

export default AsyncPaymentSuccessEmail;
