import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, special } from './_styles/shared';

export interface CheckoutAbandonedProps {
  firstName: string;
  checkoutUrl: string;
  urgencyText?: string;
}

export const subject = 'Complete your Potion signup';

const CheckoutAbandonedEmail: React.FC<CheckoutAbandonedProps> = ({
  firstName,
  checkoutUrl,
  urgencyText,
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, complete your Potion signup and start your free trial!`}
      headerTitle="Don't miss out!"
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <Text style={components.text}>
        We noticed you started signing up for Potion but didn't complete your payment.
      </Text>

      <div style={special.urgencyBox}>
        <Text style={{ margin: 0 }}>
          ⏰ <strong>Your 7-day free trial is waiting!</strong>
        </Text>
      </div>

      <Text style={components.text}>Don't miss out on automating your business with:</Text>

      <FeaturesList />

      <Section style={components.buttonSection}>
        <Button href={checkoutUrl} style={components.button}>
          Complete Signup - Start Free Trial
        </Button>
      </Section>

      <Text style={components.smallText}>
        <strong>No commitment required</strong> - Cancel anytime during your 7-day trial.
      </Text>

      {urgencyText && (
        <Text
          style={{ ...components.text, textAlign: 'center', color: '#856404', fontWeight: 500 }}
        >
          {urgencyText}
        </Text>
      )}
    </Layout>
  );
};

const FeaturesList: React.FC = () => {
  const features = [
    'AI-powered business assistant',
    'Automated invoicing & payments',
    'Project & task management',
    'CRM & contact management',
    'Financial analytics & reports',
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

export default CheckoutAbandonedEmail;
