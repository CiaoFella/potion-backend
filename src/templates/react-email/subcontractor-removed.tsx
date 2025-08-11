import React from 'react';
import { Heading, Text, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing, statusBoxes } from './_styles/shared';
import { InfoIcon } from './_components/Icons';

export interface SubcontractorRemovedProps {
  subcontractorName: string;
  projectName: string;
  clientName?: string;
  senderName?: string;
  removalReason?: string;
}

export const subject = 'Project Access Removed - Potion';

const SubcontractorRemovedEmail: React.FC<SubcontractorRemovedProps> = ({
  subcontractorName,
  projectName,
  clientName,
  senderName,
  removalReason,
}) => {
  return (
    <Layout
      preview={`Hi ${subcontractorName}, your access to the ${projectName} project has been removed.`}
    >
      {/* Main Content */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={{ fontSize: '18px' }}>Hello {subcontractorName},</Text>

        <div style={statusBoxes.info}>
          <InfoIcon size={16} color="#2563eb" />
          Your access to the <strong>"{projectName}"</strong> project has been
          removed.
        </div>

        <Text style={components.text}>
          This means you will no longer be able to:
        </Text>

        <div style={{ margin: '16px 0' }}>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>•</span>
            <span>Access project files and documents</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>•</span>
            <span>Submit invoices for this project</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>•</span>
            <span>Track time for project tasks</span>
          </Text>
          <Text style={{ ...components.listItem, margin: '6px 0' }}>
            <span style={components.listItemBullet}>•</span>
            <span>Communicate with the project team</span>
          </Text>
        </div>

        {/* Project Details */}
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
            Project: {projectName}
          </Text>
          {clientName && (
            <Text style={{ ...components.smallText, margin: '0 0 4px 0' }}>
              <strong>Client:</strong> {clientName}
            </Text>
          )}
          {senderName && (
            <Text style={{ ...components.smallText, margin: '0' }}>
              <strong>Removed by:</strong> {senderName}
            </Text>
          )}
        </Section>

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
          change, please contact{' '}
          {senderName || clientName || 'the project manager'} directly.
        </Text>
      </Section>

      <Hr style={components.divider} />

      {/* Footer */}
      <Section
        style={{ padding: `0 ${spacing.xl} ${spacing.xl} ${spacing.xl}` }}
      >
        <Text style={components.footerText}>
          You may still have access to other projects through your Potion
          dashboard. If you need assistance, contact us at{' '}
          <a href="mailto:support@potionapp.com" style={components.link}>
            support@potionapp.com
          </a>
        </Text>
      </Section>
    </Layout>
  );
};

export default SubcontractorRemovedEmail;
