import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import { InfoIcon, CheckIcon } from './_components/Icons';

// TypeScript interface for props
export interface PasswordResetProps {
  firstName: string;
  resetUrl: string;
  tokenExpiry?: string;
  roleType?: 'user' | 'accountant' | 'subcontractor';
}

// Subject line for the email
export const subject = 'Reset your Potion password';

// Main template component
const PasswordResetEmail: React.FC<PasswordResetProps> = ({
  firstName,
  resetUrl,
  tokenExpiry = '48 hours',
  roleType = 'user',
}) => {
  const roleContext = {
    user: {
      title: 'Reset your password',
      description: 'Reset your Potion business account password',
      accessDescription:
        'Once reset, you can login to your dashboard and continue managing your business operations.',
    },
    accountant: {
      title: 'Reset your accountant password',
      description: 'Reset your Potion accountant access password',
      accessDescription:
        "Once reset, you can login and continue accessing your clients' financial data and reports.",
    },
    subcontractor: {
      title: 'Reset your password',
      description: 'Reset your Potion project access password',
      accessDescription:
        'Once reset, you can login and continue working on your assigned projects.',
    },
  };

  const context = roleContext[roleType];

  return (
    <Layout
      preview={`Hi ${firstName}, reset your Potion password to regain access to your account.`}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <Text style={components.text}>
        We received a request to reset your password for your Potion account.
      </Text>

      <div style={statusBoxes.info}>
        <InfoIcon size={16} color="#2563eb" />
        <strong>{context.description}</strong>
      </div>

      <Text style={components.text}>
        Click the button below to create a new password:
      </Text>

      <Section style={components.buttonSection}>
        <Button href={resetUrl} style={components.button}>
          Reset My Password
        </Button>
      </Section>

      <Text style={components.smallText}>
        <strong>This link expires in {tokenExpiry}</strong> - please reset your
        password soon to avoid having to request a new link.
      </Text>

      <Text style={components.text}>{context.accessDescription}</Text>

      <div
        style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          margin: '24px 0',
        }}
      >
        <Text
          style={{
            ...components.smallText,
            margin: '0 0 8px 0',
            fontWeight: '600',
          }}
        >
          Security Notice:
        </Text>
        <Text style={{ ...components.smallText, margin: '0' }}>
          If you didn't request this password reset, you can safely ignore this
          email. Your account remains secure.
        </Text>
      </div>

      <Text style={components.smallText}>
        <strong>Need help?</strong> Just reply to this email and our support
        team will assist you.
      </Text>
    </Layout>
  );
};

export default PasswordResetEmail;
