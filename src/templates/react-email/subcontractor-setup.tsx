import React from 'react';
import { Heading, Text, Button, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing, statusBoxes, layout } from './_styles/shared';
import {
  SparklesIcon,
  FileTextIcon,
  SettingsIcon,
  CalendarIcon,
  DollarSignIcon,
  UsersIcon,
} from './_components/Icons';

export interface SubcontractorSetupProps {
  subcontractorName: string;
  setupUrl: string;
  clientName?: string;
  senderName?: string;
}

export const subject = 'Welcome to Potion - Set up your account';

const SubcontractorSetupEmail: React.FC<SubcontractorSetupProps> = ({
  subcontractorName,
  setupUrl,
  clientName,
  senderName = 'Project Manager',
}) => {
  return (
    <Layout
      preview={`Hi ${subcontractorName}, welcome to Potion! Set up your account to get started.`}
    >
      {/* Header */}
      <Section style={layout.content}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <SparklesIcon size={48} color="#1EC64C" />
          <Heading style={components.mainHeading}>Welcome to Potion!</Heading>
          <Text style={components.textLarge}>
            You've been invited to join the team
            {clientName ? ` by ${clientName}` : ''}
          </Text>
        </div>
      </Section>

      <Hr style={components.divider} />

      {/* Main Content */}
      <Section style={layout.content}>
        <Text style={components.text}>Hi {subcontractorName},</Text>

        <Text style={components.text}>
          {senderName} has invited you to collaborate on Potion, a professional
          project management platform. To get started, you'll need to set up
          your account password.
        </Text>

        {/* Setup Button */}
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <Button href={setupUrl} style={components.button}>
            Set Up My Account
          </Button>
        </div>

        <Text style={components.text}>
          Once your account is set up, you'll be able to:
        </Text>

        {/* Features List */}
        <div style={{ margin: '2rem 0' }}>
          <Text style={components.listItem}>
            <FileTextIcon size={16} color="#1EC64C" />
            Access project files and documentation
          </Text>

          <Text style={components.listItem}>
            <CalendarIcon size={16} color="#1EC64C" />
            Track your time and manage tasks
          </Text>

          <Text style={components.listItem}>
            <DollarSignIcon size={16} color="#1EC64C" />
            Submit invoices and track payments
          </Text>

          <Text style={components.listItem}>
            <UsersIcon size={16} color="#1EC64C" />
            Collaborate with the team
          </Text>
        </div>
      </Section>

      <Hr style={components.divider} />

      {/* Security Notice */}
      <Section style={layout.content}>
        <div style={statusBoxes.info}>
          <Text style={{ ...components.smallText, margin: 0 }}>
            <SettingsIcon size={16} color="#2563eb" />
            <strong>Security Notice:</strong> This setup link expires in 48
            hours. If you don't set up your account within this time, please
            contact {senderName} for a new invitation.
          </Text>
        </div>
      </Section>

      {/* Footer */}
      <Section style={layout.content}>
        <Text style={components.smallText}>
          If you didn't expect this invitation or have any questions, please
          contact {senderName} directly.
        </Text>

        <Text style={components.smallText}>
          If you're having trouble with the button above, copy and paste this
          link into your browser:
          <br />
          <span style={{ wordBreak: 'break-all' }}>{setupUrl}</span>
        </Text>
      </Section>
    </Layout>
  );
};

export default SubcontractorSetupEmail;
