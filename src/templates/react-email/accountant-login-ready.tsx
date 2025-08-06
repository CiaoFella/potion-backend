import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import {
  CheckCircleIcon,
  BarChartIcon,
  DollarSignIcon,
  UsersIcon,
  InfoIcon,
  FileTextIcon,
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
  loginUrl = 'https://app.potionapp.com/login',
  clientsCount,
  clientNames = [],
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, your password has been set successfully! You can now login to access your client's financial data.`}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <div style={statusBoxes.success}>
        <CheckCircleIcon size={16} color="#059669" />
        <strong>Great news!</strong> Your accountant access has been set up
        successfully.
      </div>

      <Text style={components.text}>
        Your Potion account is now ready! You can login and access your client's
        financial data and reports anytime.
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
              {clientNames.length > 3 && ` and ${clientNames.length - 3} more`}
            </>
          )}
        </Text>
      )}

      <Text style={components.text}>
        <strong>What you can access:</strong>
      </Text>

      <AccountantAccessFeatures />

      <Section style={components.buttonSection}>
        <Button href={loginUrl} style={components.button}>
          Login to Your Dashboard
        </Button>
      </Section>

      <Text style={components.smallText}>
        <strong>Need help?</strong> Just reply to this email - our support team
        is here to assist you.
      </Text>

      <div style={statusBoxes.info}>
        <InfoIcon size={16} color="#2563eb" />
        Bookmark your login page: {loginUrl}
      </div>
    </Layout>
  );
};

const AccountantAccessFeatures: React.FC = () => {
  const features = [
    {
      icon: <BarChartIcon size={14} color="#059669" />,
      text: 'Real-time financial reports and analytics',
    },
    {
      icon: <DollarSignIcon size={14} color="#059669" />,
      text: 'Transaction history and categorization',
    },
    {
      icon: <FileTextIcon size={14} color="#059669" />,
      text: 'Invoice and contract management',
    },
    {
      icon: <UsersIcon size={14} color="#059669" />,
      text: 'Client project overview and tracking',
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
