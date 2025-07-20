import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, colors } from './_styles/shared';
import {
  ClockIcon,
  CheckIcon,
  BarChartIcon,
  DollarSignIcon,
  UsersIcon,
  SettingsIcon,
  StarIcon,
} from './_components/Icons';

export interface TrialEndingProps {
  firstName: string;
  daysRemaining: number;
  trialDays?: number;
  monthlyPrice?: number;
  billingUrl?: string;
  usageStats?: boolean;
  projectsCreated?: number;
  invoicesSent?: number;
  tasksCompleted?: number;
  clientsAdded?: number;
}

export const subject =
  'Your Potion trial converts to paid in {{daysRemaining}} days';

const TrialEndingEmail: React.FC<TrialEndingProps> = ({
  firstName,
  daysRemaining,
  trialDays = 7,
  monthlyPrice = 29,
  billingUrl = 'https://app.potionapp.com/billing',
  usageStats = false,
  projectsCreated,
  invoicesSent,
  tasksCompleted,
  clientsAdded,
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, your ${trialDays}-day trial converts to paid in ${daysRemaining} days.`}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <Text style={components.text}>
        Your {trialDays}-day Potion trial will automatically convert to a paid
        subscription soon.
      </Text>

      <div style={statusBoxes.warning}>
        <ClockIcon size={16} color="#d97706" />
        Your subscription will be charged in {daysRemaining}{' '}
        {daysRemaining === 1 ? 'day' : 'days'}
      </div>

      <Text style={components.text}>
        <strong>What happens next:</strong> Your subscription will automatically
        renew at ${monthlyPrice}/month. You'll keep full access to all features
        with no interruption.
      </Text>

      {usageStats &&
        (projectsCreated || invoicesSent || tasksCompleted || clientsAdded) && (
          <div
            style={{
              backgroundColor: colors.backgroundLight,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '20px',
              margin: '24px 0',
            }}
          >
            <Heading
              style={{ ...components.sectionHeading, margin: '0 0 16px 0' }}
            >
              Your progress so far:
            </Heading>
            <div>
              {projectsCreated && (
                <Text style={{ ...components.listItem, margin: '6px 0' }}>
                  <span style={components.listItemBullet}>
                    <BarChartIcon size={14} color="#1EC64C" />
                  </span>
                  <span>{projectsCreated} projects created</span>
                </Text>
              )}
              {invoicesSent && (
                <Text style={{ ...components.listItem, margin: '6px 0' }}>
                  <span style={components.listItemBullet}>
                    <DollarSignIcon size={14} color="#1EC64C" />
                  </span>
                  <span>{invoicesSent} invoices sent</span>
                </Text>
              )}
              {tasksCompleted && (
                <Text style={{ ...components.listItem, margin: '6px 0' }}>
                  <span style={components.listItemBullet}>
                    <CheckIcon size={14} color="#1EC64C" />
                  </span>
                  <span>{tasksCompleted} tasks completed</span>
                </Text>
              )}
              {clientsAdded && (
                <Text style={{ ...components.listItem, margin: '6px 0' }}>
                  <span style={components.listItemBullet}>
                    <UsersIcon size={14} color="#1EC64C" />
                  </span>
                  <span>{clientsAdded} clients added</span>
                </Text>
              )}
            </div>
            <Text
              style={{
                ...components.text,
                fontWeight: 600,
                margin: '16px 0 0 0',
              }}
            >
              Great progress! Your subscription will continue seamlessly with
              all your data intact.
            </Text>
          </div>
        )}

      <Text style={components.text}>
        With your paid subscription, you'll continue enjoying:
      </Text>

      <SubscriptionFeatures />

      <Section style={components.buttonSection}>
        <Button href={billingUrl} style={components.button}>
          Manage Billing - ${monthlyPrice}/month
        </Button>
      </Section>

      <Text style={components.smallText}>
        Want to cancel before renewal?{' '}
        <a href={billingUrl} style={components.link}>
          Visit your billing settings
        </a>{' '}
        or{' '}
        <a href="mailto:support@potionapp.com" style={components.link}>
          contact support
        </a>
        .
      </Text>
    </Layout>
  );
};

const SubscriptionFeatures: React.FC = () => {
  const features = [
    {
      icon: <CheckIcon size={14} color="#1EC64C" />,
      text: 'All your projects and data remain safe',
    },
    {
      icon: <SettingsIcon size={14} color="#1EC64C" />,
      text: 'Unlimited AI assistant usage',
    },
    {
      icon: <BarChartIcon size={14} color="#1EC64C" />,
      text: 'Advanced reporting and analytics',
    },
    {
      icon: <StarIcon size={14} color="#1EC64C" />,
      text: 'Priority customer support',
    },
    {
      icon: <SettingsIcon size={14} color="#1EC64C" />,
      text: 'Full integration capabilities',
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

export default TrialEndingEmail;
