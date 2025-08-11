import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, colors, spacing } from './_styles/shared';
import {
  ClockIcon,
  CheckIcon,
  BankIcon,
  AIIcon,
  ReportsIcon,
  UsersIcon,
  BarChartIcon,
  DollarSignIcon,
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
  billingUrl = 'https://my.potionapp.com/billing',
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
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>Hey {firstName} 👋</Heading>

        <Text style={components.text}>
          Hope you're loving how easy Potion makes managing your finances!
          You've been trying it out for {trialDays - daysRemaining} days now.
        </Text>

        <div style={statusBoxes.info}>
          <ClockIcon size={16} color="#2563eb" />
          Your trial automatically converts to paid in {daysRemaining}{' '}
          {daysRemaining === 1 ? 'day' : 'days'}
        </div>

        <Text style={components.text}>
          <strong>Good news:</strong> Nothing changes except you keep using
          Potion for just ${monthlyPrice}/month. All your data stays exactly
          where it is.
        </Text>
      </Section>

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

      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={components.text}>
          You'll keep getting all the features that make your financial life
          easier:
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
      </Section>
    </Layout>
  );
};

const SubscriptionFeatures: React.FC = () => {
  const features = [
    {
      icon: <BankIcon size={14} color="#1EC64C" />,
      text: 'Unlimited bank connections and transaction syncing',
    },
    {
      icon: <AIIcon size={14} color="#1EC64C" />,
      text: 'Ask AI about any transaction, anytime',
    },
    {
      icon: <ReportsIcon size={14} color="#1EC64C" />,
      text: 'Generate all financial reports instantly',
    },
    {
      icon: <UsersIcon size={14} color="#1EC64C" />,
      text: 'Share access with your accountant securely',
    },
    {
      icon: <CheckIcon size={14} color="#1EC64C" />,
      text: 'All your financial data stays organized automatically',
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
