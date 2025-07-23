import React from 'react';
import { Heading, Text, Button, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing } from './_styles/shared';
import {
  BarChartIcon,
  DollarSignIcon,
  UsersIcon,
  FileTextIcon,
  SettingsIcon,
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
      icon: <BarChartIcon size={20} />,
      title: 'Advanced Analytics',
      description: 'Comprehensive financial insights and reporting tools',
    },
    {
      icon: <DollarSignIcon size={20} />,
      title: 'Multi-Client Management',
      description: 'Manage all your clients in one centralized dashboard',
    },
    {
      icon: <FileTextIcon size={20} />,
      title: 'Automated Reports',
      description: 'Generate professional reports with a single click',
    },
    {
      icon: <SettingsIcon size={20} />,
      title: 'Professional Tools',
      description: 'Access specialized accounting and tax preparation features',
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
      {/* Header Section */}
      <Section
        style={{
          textAlign: 'center',
          padding: `${spacing.xl} 0 ${spacing.lg} 0`,
        }}
      >
        <Heading style={components.brandName}>POTION</Heading>
        <Text style={{ ...components.smallText, margin: '4px 0 0 0' }}>
          Professional Accounting Platform
        </Text>
      </Section>

      {/* Main Content */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={{ ...components.text, fontSize: '18px' }}>
          Hello {accountantName},
        </Text>

        <Text style={components.text}>
          <strong>{clientName}</strong> has invited you to access their books as
          an accountant user through Potion Accountant.
        </Text>

        <Text style={components.text}>
          As an accounting professional, there's so much more waiting for you in
          Potion Accountant besides your client's books. As the one place to
          manage all of your clients and work, Potion Accountant provides you
          with a suite of tools designed specifically for accountants to help
          you.
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
          What's Available for You
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
          textAlign: 'center',
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
          Learn more about the tools and features available to you in Potion
          Accountant. Ready to get started? Accept your invite to test drive the
          tools now.
        </Text>
        <Text style={components.footerText}>
          Need help? Contact us at{' '}
          <a href="mailto:support@potionapp.com" style={components.link}>
            support@potionapp.com
          </a>
        </Text>
      </Section>
    </Layout>
  );
};

export default AccountantInvitationEmail;
