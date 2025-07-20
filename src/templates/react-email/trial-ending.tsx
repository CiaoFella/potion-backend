import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, special, utils } from './_styles/shared';

export interface TrialEndingProps {
  firstName: string;
  daysRemaining: number;
  trialDays?: number;
  monthlyPrice?: number;
  billingUrl?: string;
  usageStats?: boolean;
  projectsCreated?: number;
  invoicesSent?: number;
  tasksCompleted?: number;
  clientsAdded?: number;
}

export const subject = 'Your Potion trial ends in {{daysRemaining}} days';

const TrialEndingEmail: React.FC<TrialEndingProps> = ({
  firstName,
  daysRemaining,
  trialDays = 7,
  monthlyPrice = 29,
  billingUrl = 'https://app.potionapp.com/billing',
  usageStats = false,
  projectsCreated,
  invoicesSent,
  tasksCompleted,
  clientsAdded,
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, your ${trialDays}-day trial ends in ${daysRemaining} days.`}
      headerTitle="⏰ Trial Ending Soon"
      headerStyle={special.warningHeader}
    >
      <Heading style={components.mainHeading}>Hi {firstName},</Heading>

      <div style={special.timer}>
        ⏰ Your {trialDays}-day Potion trial ends in {daysRemaining}{' '}
        {daysRemaining === 1 ? 'day' : 'days'}
      </div>

      <Text style={components.text}>
        Keep your access to all premium features by continuing your
        subscription.
      </Text>

      {usageStats &&
        (projectsCreated || invoicesSent || tasksCompleted || clientsAdded) && (
          <div style={special.stats}>
            <Heading as="h3" style={components.sectionHeading}>
              Your trial activity:
            </Heading>
            <div>
              {projectsCreated && (
                <Text style={components.featureItem}>
                  📊 {projectsCreated} projects created
                </Text>
              )}
              {invoicesSent && (
                <Text style={components.featureItem}>
                  💰 {invoicesSent} invoices sent
                </Text>
              )}
              {tasksCompleted && (
                <Text style={components.featureItem}>
                  ✅ {tasksCompleted} tasks completed
                </Text>
              )}
              {clientsAdded && (
                <Text style={components.featureItem}>
                  👥 {clientsAdded} clients added
                </Text>
              )}
            </div>
            <Text style={{ ...components.text, fontWeight: 600 }}>
              Don't lose your progress! Continue your subscription to keep all
              your data and work.
            </Text>
          </div>
        )}

      <Text style={components.text}>
        What you'll keep with your subscription:
      </Text>

      <SubscriptionFeatures />

      <Section style={components.buttonSection}>
        <Button href={billingUrl} style={components.button}>
          Continue Subscription - ${monthlyPrice}/month
        </Button>
      </Section>

      <Text style={{ ...components.text, textAlign: 'center' }}>
        Questions about your subscription?{' '}
        <a href="mailto:support@potionapp.com" style={components.link}>
          Contact our team
        </a>
      </Text>
    </Layout>
  );
};

const SubscriptionFeatures: React.FC = () => {
  const features = [
    'All your projects and data',
    'Unlimited AI assistant usage',
    'Advanced reporting & analytics',
    'Priority customer support',
    'Integration with your favorite tools',
  ];

  return (
    <div>
      {features.map((feature, index) => (
        <Text key={index} style={components.featureItem}>
          ✓ {feature}
        </Text>
      ))}
    </div>
  );
};

export default TrialEndingEmail;
