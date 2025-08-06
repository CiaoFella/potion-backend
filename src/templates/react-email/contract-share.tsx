import React from 'react';
import { Heading, Text, Button, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing } from './_styles/shared';
import { FileTextIcon, InfoIcon } from './_components/Icons';

export interface ContractShareProps {
  contractType: string;
  contractUrl: string;
  clientName?: string;
  senderName?: string;
}

export const subject = 'You have received a contract';

const ContractShareEmail: React.FC<ContractShareProps> = ({
  contractType,
  contractUrl,
  clientName = 'there',
  senderName = 'Your business partner',
}) => {
  return (
    <Layout>
      {/* Header */}
      <Section
        style={{
          textAlign: 'center',
          padding: `${spacing.xl} 0 ${spacing.lg} 0`,
        }}
      >
        <Heading style={components.brandName}>POTION</Heading>
        <Text style={{ ...components.smallText, margin: '4px 0 0 0' }}>
          Contract Management System
        </Text>
      </Section>

      {/* Main Content */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={{ ...components.text, fontSize: '18px' }}>
          Hello {clientName},
        </Text>

        <Text style={components.text}>
          <strong>{senderName}</strong> has shared a{' '}
          <strong>{contractType}</strong> contract with you for your review and
          signature.
        </Text>

        <Text style={components.text}>
          Please review the contract carefully. Once you're ready, you can
          digitally sign the document using the link below.
        </Text>
      </Section>

      {/* Contract Details */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: spacing.lg,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <FileTextIcon size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <Text
              style={{
                ...components.text,
                fontWeight: '600',
                margin: '0 0 4px 0',
              }}
            >
              {contractType} Contract
            </Text>
            <Text style={{ ...components.smallText, margin: '0' }}>
              Ready for your review and signature
            </Text>
          </div>
        </div>
      </Section>

      {/* Information Box */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <div
          style={{
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '8px',
            padding: spacing.md,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <div style={{ flexShrink: 0, marginTop: '2px' }}>
            <InfoIcon size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <Text
              style={{ ...components.smallText, margin: '0', color: '#1d4ed8' }}
            >
              This contract is securely hosted on Potion's platform. Your
              signature will be legally binding and encrypted for security.
            </Text>
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section
        style={{
          ...components.buttonSection,
          textAlign: 'center',
          padding: `${spacing.xl} ${spacing.xl} 0 ${spacing.xl}`,
        }}
      >
        <Button href={contractUrl} style={components.button}>
          Review & Sign Contract
        </Button>
      </Section>

      <Hr style={components.divider} />

      {/* Footer */}
      <Section
        style={{ padding: `0 ${spacing.xl} ${spacing.xl} ${spacing.xl}` }}
      >
        <Text style={components.footerText}>
          This contract was shared via Potion's secure platform. If you have any
          questions about this contract, please contact {senderName} directly.
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

export default ContractShareEmail;
