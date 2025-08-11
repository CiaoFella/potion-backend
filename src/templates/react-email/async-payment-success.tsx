import React from 'react';
import { Heading, Text, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, spacing } from './_styles/shared';
import {
  SparklesIcon,
  BankIcon,
  AIIcon,
  ReportsIcon,
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
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>
          You're all set, {firstName}! 🎉
        </Heading>

        <div style={statusBoxes.success}>
          <SparklesIcon size={16} color="#059669" />
          <strong>Payment confirmed!</strong> Your {trialDays}-day trial is now
          active.
        </div>

        <Text style={components.text}>
          Time to get your finances organized. If you haven't set up your
          password yet, check your email for the setup link.
        </Text>

        <Text style={components.text}>Here's what you can do right away:</Text>

        <TrialFeatures />

        <Text style={components.text}>
          <strong>Ready to dive in?</strong> Log in and connect your bank
          account - it takes less than 2 minutes and you'll see all your
          transactions categorized automatically.
        </Text>

        <Text style={components.smallText}>
          Questions? Just reply to this email and we'll help you out.
        </Text>
      </Section>
    </Layout>
  );
};

const TrialFeatures: React.FC = () => {
  const features = [
    {
      icon: <BankIcon size={14} color="#059669" />,
      text: 'Connect your bank and automatically categorize transactions',
    },
    {
      icon: <AIIcon size={14} color="#059669" />,
      text: "Ask AI about any transaction you don't recognize",
    },
    {
      icon: <ReportsIcon size={14} color="#059669" />,
      text: 'Generate profit & loss, cash flow, and balance sheet reports',
    },
    {
      icon: <UsersIcon size={14} color="#059669" />,
      text: 'Give your accountant secure access to all your financial data',
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
