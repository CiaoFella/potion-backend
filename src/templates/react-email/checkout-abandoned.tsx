import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import {
  ClockIcon,
  CheckIcon,
  SettingsIcon,
  DollarSignIcon,
  BarChartIcon,
  UsersIcon,
} from './_components/Icons';

export interface CheckoutAbandonedProps {
  firstName: string;
  checkoutUrl: string;
  urgencyText?: string;
}

export const subject = 'Complete your Potion signup - Free trial waiting';

const CheckoutAbandonedEmail: React.FC<CheckoutAbandonedProps> = ({
  firstName,
  checkoutUrl,
  urgencyText,
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, complete your Potion signup and start your free trial!`}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <Text style={components.text}>
        We noticed you started signing up for Potion but didn't complete the
        process.
      </Text>

      <div style={statusBoxes.info}>
        <ClockIcon size={16} color="#2563eb" />
        <strong>Your 7-day free trial is waiting for you!</strong>
      </div>

      <Text style={components.text}>
        Don't miss out on automating your business operations with these
        powerful features:
      </Text>

      <FeaturesList />

      <Section style={components.buttonSection}>
        <Button href={checkoutUrl} style={components.button}>
          Complete Signup & Start Free Trial
        </Button>
      </Section>

      <Text style={components.smallText}>
        <strong>No commitment required</strong> - You can cancel anytime during
        your 7-day trial period.
      </Text>

      {urgencyText && (
        <div style={statusBoxes.warning}>
          <ClockIcon size={16} color="#d97706" />
          {urgencyText}
        </div>
      )}

      <Text style={components.smallText}>
        Questions before you start? Just reply to this email and we'll help you
        out.
      </Text>
    </Layout>
  );
};

const FeaturesList: React.FC = () => {
  const features = [
    {
      icon: <SettingsIcon size={14} color="#2563eb" />,
      text: 'AI-powered business assistant and automation',
    },
    {
      icon: <DollarSignIcon size={14} color="#2563eb" />,
      text: 'Automated invoicing and payment processing',
    },
    {
      icon: <BarChartIcon size={14} color="#2563eb" />,
      text: 'Financial analytics and comprehensive reports',
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

export default CheckoutAbandonedEmail;
