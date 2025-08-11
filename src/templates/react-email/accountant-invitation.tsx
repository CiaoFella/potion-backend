import React from 'react';
import { Heading, Text, Button, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing } from './_styles/shared';
import {
  ReportsIcon,
  AIIcon,
  UsersIcon,
  CheckCircleIcon,
} from './_components/Icons';

export interface AccountantInvitationProps {
  clientName: string;
  inviteUrl: string;
  accountantName?: string;
  note?: string; // Add note field
}

export const subject =
  'Invitation to Access Financial Records - Potion Accountant';

const AccountantInvitationEmail: React.FC<AccountantInvitationProps> = ({
  clientName,
  inviteUrl,
  accountantName = 'there',
  note,
}) => {
  const features = [
    {
      icon: <ReportsIcon size={20} />,
      title: 'Financial Reports Ready',
      description:
        'Profit & loss, cash flow, and balance sheet reports generated instantly',
    },
    {
      icon: <CheckCircleIcon size={20} />,
      title: 'Auto-Categorized Transactions',
      description:
        'All transactions are automatically categorized and reconciled',
    },
    {
      icon: <AIIcon size={20} />,
      title: 'AI Transaction Insights',
      description:
        'Get context on any transaction with AI-powered explanations',
    },
    {
      icon: <UsersIcon size={20} />,
      title: 'Secure Client Access',
      description:
        'Bank-level security with role-based permissions for accountants',
    },
  ];

  const featureItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    margin: `${spacing.md} 0`,
  };

  const featureContentStyle = {
    flex: '1',
  };

  const featureTitleStyle = {
    ...components.text,
    fontWeight: '600',
    margin: '0 0 4px 0',
  };

  const featureDescriptionStyle = {
    ...components.smallText,
    margin: '0',
  };

  return (
    <Layout>
      {/* Main Content */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={{ ...components.text, fontSize: '18px' }}>
          Hey {accountantName},
        </Text>

        <Text style={components.text}>
          <strong>{clientName}</strong> has invited you to access their
          financial data on Potion. Everything you need is organized and ready
          to go.
        </Text>

        <Text style={components.text}>
          No more chasing down spreadsheets or waiting for bank statements.
          You'll have real-time access to all their financial data,
          automatically categorized and reconciled.
        </Text>

        {/* Personal Note Section */}
        {note && (
          <Section
            style={{
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: spacing.lg,
              margin: `${spacing.lg} 0`,
            }}
          >
            <Text
              style={{
                ...components.text,
                fontWeight: '600',
                margin: '0 0 8px 0',
              }}
            >
              Personal Message from {clientName}:
            </Text>
            <Text
              style={{ ...components.text, margin: '0', fontStyle: 'italic' }}
            >
              "{note}"
            </Text>
          </Section>
        )}
      </Section>

      {/* Features Section */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.sectionHeading}>
          Here's what you'll have access to:
        </Heading>

        {features.map((feature, index) => (
          <div key={index} style={featureItemStyle}>
            <div style={{ flexShrink: 0 }}>{feature.icon}</div>
            <div style={featureContentStyle}>
              <Text style={featureTitleStyle}>{feature.title}</Text>
              <Text style={featureDescriptionStyle}>{feature.description}</Text>
            </div>
          </div>
        ))}
      </Section>

      {/* CTA Section */}
      <Section
        style={{
          ...components.buttonSection,
          padding: `${spacing.xl} ${spacing.xl} 0 ${spacing.xl}`,
        }}
      >
        <Button href={inviteUrl} style={components.button}>
          Accept Invitation
        </Button>
      </Section>

      <Hr style={components.divider} />

      {/* Footer */}
      <Section
        style={{ padding: `0 ${spacing.xl} ${spacing.xl} ${spacing.xl}` }}
      >
        <Text style={components.footerText}>
          Everything is automatically synced and up-to-date, so you can focus on
          what matters most - helping your client make better financial
          decisions.
        </Text>
        <Text style={components.footerText}>
          Questions? Just reply to this email and we'll help you get set up.
        </Text>
      </Section>
    </Layout>
  );
};

export default AccountantInvitationEmail;
