import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, spacing } from './_styles/shared';
import { ClockIcon, BankIcon, AIIcon, ReportsIcon } from './_components/Icons';

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
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>Hey {firstName} 👋</Heading>

        <Text style={components.text}>
          You started signing up for Potion but didn't finish. No worries -
          happens to the best of us!
        </Text>

        <div style={statusBoxes.info}>
          <ClockIcon size={16} color="#2563eb" />
          <strong>Your free trial is still waiting for you</strong>
        </div>

        <Text style={components.text}>
          Here's what you'll get when you complete your signup:
        </Text>

        <FeaturesList />

        <Section style={components.buttonSection}>
          <Button href={checkoutUrl} style={components.button}>
            Complete Signup - Start Free Trial
          </Button>
        </Section>

        <Text style={components.smallText}>
          <strong>7 days free, cancel anytime.</strong> No strings attached.
        </Text>

        {urgencyText && (
          <div style={statusBoxes.warning}>
            <ClockIcon size={16} color="#d97706" />
            {urgencyText}
          </div>
        )}

        <Text style={components.smallText}>
          Questions before you start? Just reply to this email and we'll help
          you out.
        </Text>
      </Section>
    </Layout>
  );
};

const FeaturesList: React.FC = () => {
  const features = [
    {
      icon: <BankIcon size={14} color="#2563eb" />,
      text: 'Connect your bank and get transactions automatically categorized',
    },
    {
      icon: <AIIcon size={14} color="#2563eb" />,
      text: "Chat with AI about any transaction you don't recognize",
    },
    {
      icon: <ReportsIcon size={14} color="#2563eb" />,
      text: 'Generate profit & loss, cash flow, and balance sheet reports',
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
