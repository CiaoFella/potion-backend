import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes, spacing } from './_styles/shared';
import {
  CheckCircleIcon,
  ReportsIcon,
  AIIcon,
  UsersIcon,
  InfoIcon,
} from './_components/Icons';

export interface AccountantLoginReadyProps {
  firstName: string;
  loginUrl?: string;
  clientsCount?: number;
  clientNames?: string[];
}

export const subject =
  'Your Potion accountant access is ready - You can now login!';

const AccountantLoginReadyEmail: React.FC<AccountantLoginReadyProps> = ({
  firstName,
  loginUrl = 'https://my.potionapp.com/login',
  clientsCount,
  clientNames = [],
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, your password has been set successfully! You can now login to access your client's financial data.`}
    >
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>Hey {firstName} 👋</Heading>

        <div style={statusBoxes.success}>
          <CheckCircleIcon size={16} color="#059669" />
          <strong>You're all set!</strong> Your accountant access is ready to
          go.
        </div>

        <Text style={components.text}>
          You can now log in and access all your client's financial data.
          Everything is automatically organized and up-to-date.
        </Text>

        {clientsCount && clientsCount > 0 && (
          <Text style={components.text}>
            <strong>
              You have access to {clientsCount} client
              {clientsCount > 1 ? 's' : ''}:
            </strong>
            {clientNames.length > 0 && (
              <>
                <br />
                {clientNames.slice(0, 3).join(', ')}
                {clientNames.length > 3 &&
                  ` and ${clientNames.length - 3} more`}
              </>
            )}
          </Text>
        )}

        <Text style={components.text}>
          <strong>Here's what you can access:</strong>
        </Text>

        <AccountantAccessFeatures />

        <Section style={components.buttonSection}>
          <Button href={loginUrl} style={components.button}>
            Login to Your Dashboard
          </Button>
        </Section>

        <Text style={components.smallText}>
          <strong>Need help?</strong> Just reply to this email - our support
          team is here to assist you.
        </Text>

        <div style={statusBoxes.info}>
          <InfoIcon size={16} color="#2563eb" />
          Bookmark your login page: {loginUrl}
        </div>
      </Section>
    </Layout>
  );
};

const AccountantAccessFeatures: React.FC = () => {
  const features = [
    {
      icon: <ReportsIcon size={14} color="#059669" />,
      text: 'Profit & loss, cash flow, and balance sheet reports',
    },
    {
      icon: <AIIcon size={14} color="#059669" />,
      text: 'AI-powered transaction insights and categorization',
    },
    {
      icon: <UsersIcon size={14} color="#059669" />,
      text: 'Real-time access to all client financial data',
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

export default AccountantLoginReadyEmail;
