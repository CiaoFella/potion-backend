import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components } from './_styles/shared';

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
  actionText = 'Take Action',
  messageTitle,
  messageBody,
  additionalInfo,
  tokenExpiry,
}) => {
  return (
    <Layout preview={`Hi ${firstName}, ${emailSubject}`} headerTitle="Potion">
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      {messageTitle && (
        <Heading as="h3" style={components.sectionHeading}>
          {messageTitle}
        </Heading>
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
          This link expires in {tokenExpiry}.
        </Text>
      )}

      {additionalInfo && <Text style={components.text}>{additionalInfo}</Text>}

      <Text style={components.text}>
        If you have any questions, please don't hesitate to reach out to our
        support team.
      </Text>
    </Layout>
  );
};

export default EmailFallbackTemplate;
