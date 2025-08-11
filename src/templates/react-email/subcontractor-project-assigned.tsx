import React from 'react';
import { Heading, Text, Button, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing, statusBoxes } from './_styles/shared';
import {
  CheckCircleIcon,
  FileTextIcon,
  SettingsIcon,
  CalendarIcon,
  UsersIcon,
} from './_components/Icons';

export interface SubcontractorProjectAssignedProps {
  subcontractorName: string;
  projectName: string;
  clientName?: string;
  senderName?: string;
  projectDescription?: string;
  loginUrl?: string;
}

export const subject = 'New Project Assignment - Potion';

const SubcontractorProjectAssignedEmail: React.FC<
  SubcontractorProjectAssignedProps
> = ({
  subcontractorName,
  projectName,
  clientName,
  senderName = 'Project Manager',
  projectDescription,
  loginUrl = 'https://my.potionapp.com/login',
}) => {
  return (
    <Layout
      preview={`Hi ${subcontractorName}, you've been assigned to the ${projectName} project.`}
    >
      {/* Main Content */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={{ ...components.text, fontSize: '18px' }}>
          Hello {subcontractorName},
        </Text>

        <div style={statusBoxes.success}>
          <CheckCircleIcon size={16} color="#059669" />
          <strong>Great news!</strong> You've been assigned to a new project.
        </div>

        <Text style={components.text}>
          <strong>{senderName}</strong>
          {clientName && ` from ${clientName}`} has assigned you to the{' '}
          <strong>"{projectName}"</strong> project.
        </Text>

        {projectDescription && (
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
              Project Details:
            </Text>
            <Text style={{ ...components.text, margin: '0' }}>
              {projectDescription}
            </Text>
          </Section>
        )}
      </Section>

      {/* Project Access Features */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.sectionHeading}>What You Can Access</Heading>

        <ProjectAccessFeatures />
      </Section>

      {/* CTA Section */}
      <Section
        style={{
          ...components.buttonSection,
          padding: `${spacing.xl} ${spacing.xl} 0 ${spacing.xl}`,
        }}
      >
        <Button href={loginUrl} style={components.button}>
          Access Project Dashboard
        </Button>
      </Section>

      <Text
        style={{
          ...components.smallText,
          padding: `0 ${spacing.xl}`,
        }}
      >
        Use your existing Potion login credentials to access the project.
      </Text>

      <Hr style={components.divider} />

      {/* Footer */}
      <Section
        style={{ padding: `0 ${spacing.xl} ${spacing.xl} ${spacing.xl}` }}
      >
        <Text style={components.footerText}>
          You can now collaborate on this project through your Potion dashboard.
          If you have any questions about the project, please contact{' '}
          {senderName}
          {clientName && ` at ${clientName}`} directly.
        </Text>
        <Text style={components.footerText}>
          Need help with the platform? Contact us at{' '}
          <a href="mailto:support@potionapp.com" style={components.link}>
            support@potionapp.com
          </a>
        </Text>
      </Section>
    </Layout>
  );
};

const ProjectAccessFeatures: React.FC = () => {
  const features = [
    {
      icon: <FileTextIcon size={14} color="#059669" />,
      text: 'Access project files and documents',
    },
    {
      icon: <CalendarIcon size={14} color="#059669" />,
      text: 'Track time and submit timesheets',
    },
    {
      icon: <SettingsIcon size={14} color="#059669" />,
      text: 'Manage invoices and payment information',
    },
    {
      icon: <UsersIcon size={14} color="#059669" />,
      text: 'Communicate with the project team',
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

export default SubcontractorProjectAssignedEmail;
