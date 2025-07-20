import React from 'react';
import { Heading, Text, Button, Hr, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, special } from './_styles/shared';

// TypeScript interface for props
export interface PasswordSetupProps {
  firstName: string;
  setupUrl: string;
  trialDays?: number;
  monthlyPrice?: number;
  tokenExpiry?: string;
}

// Subject line for the email
export const subject = 'Welcome to Potion! Set up your password';

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
      preview={`Welcome ${firstName}! Set up your Potion password to get started.`}
      headerTitle="Welcome to Potion!"
    >
      <Heading style={components.mainHeading}>Welcome to Potion, {firstName}!</Heading>

      <Text style={components.text}>
        Thank you for subscribing! Your {trialDays}-day trial has started.
      </Text>

      <Text style={components.text}>To access your account, please set up your password:</Text>

      <Section style={components.buttonSection}>
        <Button href={setupUrl} style={components.button}>
          Set Up Password
        </Button>
      </Section>

      <Text style={components.smallText}>This link expires in {tokenExpiry}.</Text>

      <Hr style={components.hr} />

      <Heading as="h3" style={components.sectionHeading}>
        Your trial includes:
      </Heading>

      <FeaturesList />

      {monthlyPrice && (
        <Text style={special.pricingHighlight}>Then ${monthlyPrice}/month after trial ends</Text>
      )}

      <Text style={components.text}>
        Questions? Reply to this email and we'll help you get started.
      </Text>
    </Layout>
  );
};

// Reusable Features List Component
const FeaturesList: React.FC = () => {
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

export default PasswordSetupEmail;
