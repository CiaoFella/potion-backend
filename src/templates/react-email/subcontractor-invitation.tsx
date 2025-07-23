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
      title: 'Project Documents',
      description: 'Access all project files, contracts, and documentation',
    },
    {
      icon: <CalendarIcon size={20} />,
      title: 'Time Tracking',
      description: 'Log hours and track your progress on tasks',
    },
    {
      icon: <UsersIcon size={20} />,
      title: 'Team Collaboration',
      description: 'Communicate with the project team and stakeholders',
    },
    {
      icon: <SettingsIcon size={20} />,
      title: 'Professional Tools',
      description: 'Access invoicing, reporting, and project management tools',
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
          <strong>{senderName}</strong> has invited you to join the{' '}
          <strong>"{projectName}"</strong> project as a subcontractor
          {clientName && ` for ${clientName}`}.
        </Text>

        <Text style={components.text}>
          As part of this project team, you'll have access to a comprehensive
          suite of tools designed to streamline your workflow and ensure
          successful project delivery.
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
          Welcome to the team! We're excited to work with you on this project.
          Click the button above to get started.
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

export default SubcontractorInvitationEmail;
