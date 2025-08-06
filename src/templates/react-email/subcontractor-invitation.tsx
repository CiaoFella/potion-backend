import React from 'react';
import { Heading, Text, Button, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing } from './_styles/shared';
import {
  UsersIcon,
  FileTextIcon,
  SettingsIcon,
  CalendarIcon,
} from './_components/Icons';

export interface SubcontractorInvitationProps {
  projectName: string;
  inviteUrl: string;
  subcontractorName?: string;
  clientName?: string;
  senderName?: string;
}

export const subject = 'Project Invitation - Join Our Team';

const SubcontractorInvitationEmail: React.FC<SubcontractorInvitationProps> = ({
  projectName,
  inviteUrl,
  subcontractorName = 'there',
  clientName,
  senderName = 'Project Manager',
}) => {
  const features = [
    {
      icon: <FileTextIcon size={20} />,
      title: 'Centralized Project Hub',
      description:
        'All contracts, briefs, and assets organized in one secure location',
    },
    {
      icon: <CalendarIcon size={20} />,
      title: 'Smart Time Tracking',
      description:
        'Effortless hour logging with automated timesheets and reports',
    },
    {
      icon: <UsersIcon size={20} />,
      title: 'Direct Communication',
      description:
        'Streamlined messaging with clients and project stakeholders',
    },
    {
      icon: <SettingsIcon size={20} />,
      title: 'Payment & Invoicing',
      description: 'Generate professional invoices and track payment status',
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
          Project Management Platform
        </Text>
      </Section>

      {/* Main Content */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={{ ...components.text, fontSize: '18px' }}>
          Hello {subcontractorName},
        </Text>

        <Text style={components.text}>
          <strong>{senderName}</strong> has invited you to collaborate on the{' '}
          <strong>"{projectName}"</strong> project
          {clientName && ` for ${clientName}`}.
        </Text>

        <Text style={components.text}>
          You'll have access to our professional collaboration platform with all
          the tools needed to deliver exceptional work efficiently.
        </Text>
      </Section>

      {/* Project Details */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: spacing.lg,
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
          <Text style={{ ...components.smallText, margin: '0' }}>
            <strong>Invited by:</strong> {senderName}
          </Text>
        </div>
      </Section>

      {/* Features Section */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.sectionHeading}>
          What You'll Have Access To
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
          Ready to collaborate? Accept your invitation to join the project team
          and access your dedicated workspace.
        </Text>
        <Text style={components.footerText}>
          Questions about the platform or project setup? Our support team is
          here to help at{' '}
          <a href="mailto:support@potionapp.com" style={components.link}>
            support@potionapp.com
          </a>
        </Text>
      </Section>
    </Layout>
  );
};

export default SubcontractorInvitationEmail;
