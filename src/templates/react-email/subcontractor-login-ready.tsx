import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import {
  CheckCircleIcon,
  SettingsIcon,
  FileTextIcon,
  UsersIcon,
  InfoIcon,
} from './_components/Icons';

export interface SubcontractorLoginReadyProps {
  firstName: string;
  loginUrl?: string;
  projectName?: string;
  clientName?: string;
}

export const subject = 'Your Potion account is ready - You can now login!';

const SubcontractorLoginReadyEmail: React.FC<SubcontractorLoginReadyProps> = ({
  firstName,
  loginUrl = 'https://app.potionapp.com/login',
  projectName,
  clientName,
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, your password has been set successfully! You can now login to your Potion account.`}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <div style={statusBoxes.success}>
        <CheckCircleIcon size={16} color="#059669" />
        <strong>Great news!</strong> Your password has been set successfully.
      </div>

      <Text style={components.text}>
        Your Potion account is now ready to use! You can login and access your
        project dashboard anytime.
      </Text>

      {projectName && (
        <Text style={components.text}>
          <strong>Project:</strong> {projectName}
          {clientName && (
            <>
              <br />
              <strong>Client:</strong> {clientName}
            </>
          )}
        </Text>
      )}

      <Text style={components.text}>
        <strong>What you can do with your account:</strong>
      </Text>

      <LoginReadyFeatures />

      <Section style={components.buttonSection}>
        <Button href={loginUrl} style={components.button}>
          Login to Your Account
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

const LoginReadyFeatures: React.FC = () => {
  const features = [
    {
      icon: <FileTextIcon size={14} color="#059669" />,
      text: 'Upload invoices and project deliverables',
    },
    {
      icon: <SettingsIcon size={14} color="#059669" />,
      text: 'Update your payment information and tax details',
    },
    {
      icon: <UsersIcon size={14} color="#059669" />,
      text: 'Communicate directly with your client',
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

export default SubcontractorLoginReadyEmail;
