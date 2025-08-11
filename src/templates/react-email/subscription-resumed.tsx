import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, spacing } from './_styles/shared';
import {
  SparklesIcon,
  CheckIcon,
  SettingsIcon,
  DollarSignIcon,
  BarChartIcon,
  FileTextIcon,
} from './_components/Icons';

export interface SubscriptionResumedProps {
  firstName: string;
  dashboardUrl?: string;
  billingUrl?: string;
}

export const subject = 'Welcome back! Your Potion subscription is active';

const SubscriptionResumedEmail: React.FC<SubscriptionResumedProps> = ({
  firstName,
  dashboardUrl = 'https://my.potionapp.com/dashboard',
  billingUrl = 'https://my.potionapp.com/profile/settings',
}) => {
  return (
    <Layout
      preview={`Welcome back ${firstName}! Your Potion subscription is now active and ready to use.`}
    >
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>
          Welcome back, {firstName}!
        </Heading>

        <div style={statusBoxes.success}>
          <SparklesIcon size={16} color="#059669" />
          <strong>Great news!</strong> Your Potion subscription is now active.
        </div>

        <Text style={components.text}>
          Your subscription has been successfully resumed and all premium
          features are available again.
        </Text>

        <Text style={components.text}>
          <strong>You now have full access to:</strong>
        </Text>

        <ResumedFeatures />

        <Text style={components.text}>
          <strong>Pick up where you left off!</strong> All your data, projects,
          and settings are exactly as you left them.
        </Text>

        <Section style={components.buttonSection}>
          <Button href={dashboardUrl} style={components.button}>
            Go to Dashboard
          </Button>
        </Section>

        <Text style={components.smallText}>
          Your billing will resume normally. You can{' '}
          <a href={billingUrl} style={components.link}>
            manage your subscription
          </a>{' '}
          anytime from your account settings.
        </Text>

        <Text style={components.smallText}>
          Thank you for being a valued Potion user. We're excited to help you
          automate your business operations!
        </Text>
      </Section>
    </Layout>
  );
};

const ResumedFeatures: React.FC = () => {
  const features = [
    {
      icon: <SettingsIcon size={14} color="#059669" />,
      text: 'AI-powered business assistant and automation',
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
      icon: <BarChartIcon size={14} color="#059669" />,
      text: 'Financial analytics and comprehensive reporting',
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

export default SubscriptionResumedEmail;
