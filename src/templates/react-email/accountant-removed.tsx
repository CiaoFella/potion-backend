import React from 'react';
import { Heading, Text, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing, statusBoxes } from './_styles/shared';
import { InfoIcon } from './_components/Icons';

export interface AccountantRemovedProps {
  accountantName: string;
  clientName: string;
  removalReason?: string;
}

export const subject = 'Access Removed - Potion Accountant';

const AccountantRemovedEmail: React.FC<AccountantRemovedProps> = ({
  accountantName,
  clientName,
  removalReason,
}) => {
  return (
    <Layout
      preview={`Hi ${accountantName}, your access to ${clientName}'s financial records has been removed.`}
    >
      {/* Main Content */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={{ ...components.text, fontSize: '18px' }}>
          Hello {accountantName},
        </Text>

        <div style={statusBoxes.info}>
          <InfoIcon size={16} color="#2563eb" />
          Your access to <strong>{clientName}</strong>'s financial records has
          been removed.
        </div>

        <Text style={components.text}>
          This means you will no longer be able to:
        </Text>

        <div style={{ margin: '16px 0' }}>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>•</span>
            <span>Access their financial reports and analytics</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>•</span>
            <span>View their transaction history</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>•</span>
            <span>Manage their invoices and contracts</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>•</span>
            <span>Access their project information</span>
          </Text>
        </div>

        {removalReason && (
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
              Reason for removal:
            </Text>
            <Text style={{ ...components.text, margin: '0' }}>
              {removalReason}
            </Text>
          </Section>
        )}

        <Text style={components.text}>
          If you believe this was done in error or have questions about this
          change, please contact {clientName} directly.
        </Text>
      </Section>

      <Hr style={components.divider} />

      {/* Footer */}
      <Section
        style={{ padding: `0 ${spacing.xl} ${spacing.xl} ${spacing.xl}` }}
      >
        <Text style={components.footerText}>
          You still have access to other clients through your Potion Accountant
          dashboard. If you need assistance, contact us at{' '}
          <a href="mailto:support@potionapp.com" style={components.link}>
            support@potionapp.com
          </a>
        </Text>
      </Section>
    </Layout>
  );
};

export default AccountantRemovedEmail;
