import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import { InfoIcon, CheckIcon } from './_components/Icons';

export interface SubscriptionCancelledProps {
  firstName: string;
  endDate?: string;
  feedbackUrl?: string;
}

export const subject = 'Your Potion subscription has been cancelled';

const SubscriptionCancelledEmail: React.FC<SubscriptionCancelledProps> = ({
  firstName,
  endDate,
  feedbackUrl = 'https://app.potionapp.com/feedback',
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, your Potion subscription has been cancelled. We're sorry to see you go.`}
    >
      <Heading style={components.mainHeading}>
        Sorry to see you go, {firstName}
      </Heading>

      <div style={statusBoxes.info}>
        <InfoIcon size={16} color="#2563eb" />
        Your Potion subscription has been cancelled
      </div>

      <Text style={components.text}>
        {endDate ? (
          <>
            You'll continue to have access to your account until{' '}
            <strong>{endDate}</strong>.
          </>
        ) : (
          <>
            You'll continue to have access until your current billing period
            ends.
          </>
        )}
      </Text>

      <Text style={components.text}>
        <strong>What happens next:</strong>
      </Text>

      <div style={{ margin: '16px 0' }}>
        <Text style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>
            <CheckIcon size={14} color="#059669" />
          </span>
          <span>
            Your data remains secure and accessible until access expires
          </span>
        </Text>
        <Text style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>
            <CheckIcon size={14} color="#059669" />
          </span>
          <span>You can download and export your information</span>
        </Text>
        <Text style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>
            <CheckIcon size={14} color="#059669" />
          </span>
          <span>No further charges will be made to your account</span>
        </Text>
        <Text style={{ ...components.listItem, margin: '6px 0' }}>
          <span style={components.listItemBullet}>
            <CheckIcon size={14} color="#059669" />
          </span>
          <span>You can reactivate your subscription anytime</span>
        </Text>
      </div>

      <Text style={components.text}>
        <strong>Help us improve - share your feedback</strong>
      </Text>

      <Text style={components.text}>
        We'd love to know why you cancelled. Your feedback helps us build a
        better product for everyone.
      </Text>

      <Section style={components.buttonSection}>
        <Button href={feedbackUrl} style={components.button}>
          Share Feedback (2 minutes)
        </Button>
      </Section>

      <Text style={components.text}>
        <strong>Changed your mind?</strong> You can reactivate your subscription
        anytime by logging into your account. All your data will be exactly as
        you left it.
      </Text>

      <Text style={components.text}>
        Thank you for trying Potion. We hope our paths cross again in the
        future!
      </Text>

      <Text style={components.smallText}>
        Questions about your cancellation? Just reply to this email and we'll
        help you out.
      </Text>
    </Layout>
  );
};

export default SubscriptionCancelledEmail;
