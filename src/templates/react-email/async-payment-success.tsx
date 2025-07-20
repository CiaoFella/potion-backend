import React from 'react';
import { Heading, Text, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, alerts } from './_styles/shared';

export interface AsyncPaymentSuccessProps {
  firstName: string;
  trialDays?: number;
}

export const subject = 'Payment confirmed! Your Potion trial is now active';

const AsyncPaymentSuccessEmail: React.FC<AsyncPaymentSuccessProps> = ({
  firstName,
  trialDays = 7,
}) => {
  return (
    <Layout
      preview={`Payment confirmed ${firstName}! Your ${trialDays}-day Potion trial is now active.`}
      headerTitle="🎉 Payment Confirmed!"
    >
      <Heading style={components.mainHeading}>Payment Confirmed, {firstName}!</Heading>

      <div style={alerts.success}>
        ✅ <strong>Great news!</strong> Your payment has been processed successfully.
      </div>

      <Text style={components.text}>
        Your {trialDays}-day trial is now active. Check your email for password setup instructions
        if you haven't set up your password yet.
      </Text>

      <Text style={components.text}>You now have access to:</Text>

      <TrialFeatures />

      <Text style={components.text}>
        Ready to get started? Log in to your dashboard and start exploring all the features that
        will help automate your business.
      </Text>

      <Text style={components.text}>
        Questions? Reply to this email and we'll help you get started.
      </Text>
    </Layout>
  );
};

const TrialFeatures: React.FC = () => {
  const features = [
    'AI-Powered Business Assistant',
    'Projects & Task Management',
    'Contracts & Proposals',
    'Invoicing & Payments',
    'CRM & Contact Management',
    'Financial Analytics',
    'And all premium features!',
  ];

  return (
    <div>
      {features.map((feature, index) => (
        <Text key={index} style={components.featureItem}>
          ✓ {feature}
        </Text>
      ))}
    </div>
  );
};

export default AsyncPaymentSuccessEmail;
