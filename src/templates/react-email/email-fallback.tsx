import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing } from './_styles/shared';

// TypeScript interface for props
export interface EmailFallbackProps {
  firstName: string;
  subject: string;
  actionUrl?: string;
  actionText?: string;
  messageTitle?: string;
  messageBody?: string;
  additionalInfo?: string;
  tokenExpiry?: string;
}

// Subject line for the email (will be overridden by the subject prop)
export const subject = 'Email from Potion';

// Main fallback template component
const EmailFallbackTemplate: React.FC<EmailFallbackProps> = ({
  firstName,
  subject: emailSubject,
  actionUrl,
  actionText = 'Continue',
  messageTitle,
  messageBody,
  additionalInfo,
  tokenExpiry,
}) => {
  return (
    <Layout preview={`Hi ${firstName}, ${emailSubject}`}>
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Heading style={components.mainHeading}>Hi {firstName},</Heading>

        {messageTitle && (
          <Heading style={components.sectionHeading}>{messageTitle}</Heading>
        )}

        {messageBody && <Text style={components.text}>{messageBody}</Text>}

        {actionUrl && (
          <Section style={components.buttonSection}>
            <Button href={actionUrl} style={components.button}>
              {actionText}
            </Button>
          </Section>
        )}

        {tokenExpiry && (
          <Text style={components.smallText}>
            <strong>This link expires in {tokenExpiry}</strong> - please take
            action soon to avoid delays.
          </Text>
        )}

        {additionalInfo && <Text style={components.text}>{additionalInfo}</Text>}

        <Text style={components.smallText}>
          Questions? Just reply to this email and our support team will help you
          out.
        </Text>
      </Section>
    </Layout>
  );
};

export default EmailFallbackTemplate;
