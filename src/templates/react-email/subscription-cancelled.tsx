import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, alerts } from './_styles/shared';

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
      headerTitle="Subscription Cancelled"
    >
      <Heading style={components.mainHeading}>Sorry to see you go, {firstName}</Heading>

      <div style={alerts.info}>ℹ️ Your Potion subscription has been cancelled.</div>

      <Text style={components.text}>
        {endDate ? (
          <>
            You'll continue to have access to your account until <strong>{endDate}</strong>.
          </>
        ) : (
          <>You'll continue to have access until your current billing period ends.</>
        )}
      </Text>

      <Text style={components.text}>
        <strong>What happens next:</strong>
      </Text>

      <div>
        <Text style={components.featureItem}>
          ✓ Your data will remain secure and accessible until your access expires
        </Text>
        <Text style={components.featureItem}>
          ✓ You can still download your data and export your information
        </Text>
        <Text style={components.featureItem}>✓ You won't be charged again</Text>
        <Text style={components.featureItem}>
          ✓ You can reactivate anytime - we'd love to have you back!
        </Text>
      </div>

      <Text style={components.text}>
        <strong>We'd love your feedback!</strong>
      </Text>

      <Text style={components.text}>
        Help us improve by sharing why you cancelled. Your feedback helps us build a better product
        for everyone.
      </Text>

      <Section style={components.buttonSection}>
        <Button href={feedbackUrl} style={components.button}>
          Share Feedback (2 minutes)
        </Button>
      </Section>

      <Text style={components.text}>
        <strong>Changed your mind?</strong>
      </Text>

      <Text style={components.text}>
        You can reactivate your subscription anytime by logging into your account. All your data
        will be waiting for you exactly as you left it.
      </Text>

      <Text style={components.text}>
        Thank you for trying Potion. We hope our paths cross again in the future!
      </Text>

      <Text style={components.smallText}>
        <strong>Need help?</strong> Contact us at{' '}
        <a href="mailto:support@potionapp.com" style={components.link}>
          support@potionapp.com
        </a>{' '}
        if you have any questions.
      </Text>
    </Layout>
  );
};

export default SubscriptionCancelledEmail;
