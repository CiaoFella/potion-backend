import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import {
  SparklesIcon,
  CheckIcon,
  SettingsIcon,
  DollarSignIcon,
  BarChartIcon,
  FileTextIcon,
} from './_components/Icons';

export interface SubscriptionReactivatedProps {
  firstName: string;
  dashboardUrl?: string;
  trialDays?: number;
  monthlyPrice?: number;
}

export const subject = 'Welcome back! Your Potion subscription is reactivated';

const SubscriptionReactivatedEmail: React.FC<SubscriptionReactivatedProps> = ({
  firstName,
  dashboardUrl = 'https://app.potionapp.com/dashboard',
  trialDays,
  monthlyPrice = 29,
}) => {
  return (
    <Layout
      preview={`Welcome back ${firstName}! Your Potion subscription has been successfully reactivated.`}
    >
      <Heading style={components.mainHeading}>
        Welcome back, {firstName}!
      </Heading>

      <div style={statusBoxes.success}>
        <SparklesIcon size={16} color="#059669" />
        <strong>Fantastic!</strong> Your Potion subscription has been
        reactivated successfully.
      </div>

      {trialDays && trialDays > 0 ? (
        <Text style={components.text}>
          As a welcome back gesture, you'll get{' '}
          <strong>{trialDays} days</strong> to explore all the new features
          we've added since you were last here.
        </Text>
      ) : (
        <Text style={components.text}>
          We're thrilled to have you back! Your subscription is now active and
          you have immediate access to all premium features.
        </Text>
      )}

      <Text style={components.text}>
        <strong>Here's what you can dive into right away:</strong>
      </Text>

      <ReactivatedFeatures />

      <Text style={components.text}>
        <strong>What's new since you were away:</strong> We've made significant
        improvements to our AI assistant, added new automation templates, and
        enhanced our reporting capabilities.
      </Text>

      <Section style={components.buttonSection}>
        <Button href={dashboardUrl} style={components.button}>
          Explore Your Dashboard
        </Button>
      </Section>

      <Text style={components.smallText}>
        Your subscription will be billed at ${monthlyPrice}/month.{' '}
        {trialDays && trialDays > 0
          ? `Your first charge will be in ${trialDays} days.`
          : 'Your first charge will appear on your next billing cycle.'}
      </Text>

      <Text style={components.smallText}>
        Thank you for choosing Potion again. We can't wait to see what you'll
        build with our enhanced platform!
      </Text>
    </Layout>
  );
};

const ReactivatedFeatures: React.FC = () => {
  const features = [
    {
      icon: <SettingsIcon size={14} color="#059669" />,
      text: 'Enhanced AI-powered business automation',
    },
    {
      icon: <FileTextIcon size={14} color="#059669" />,
      text: 'Advanced contract templates and e-signatures',
    },
    {
      icon: <DollarSignIcon size={14} color="#059669" />,
      text: 'Streamlined invoicing with automated reminders',
    },
    {
      icon: <BarChartIcon size={14} color="#059669" />,
      text: 'Comprehensive analytics and business insights',
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

export default SubscriptionReactivatedEmail;
