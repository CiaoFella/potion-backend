import React from 'react';
import { Heading, Text, Button, Section, Hr } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, spacing } from './_styles/shared';
import { FileTextIcon, DollarSignIcon, InfoIcon } from './_components/Icons';

export interface InvoiceShareProps {
  invoiceUrl: string;
  clientName?: string;
  senderName?: string;
  invoiceNumber?: string;
  amount?: string;
  dueDate?: string;
}

export const subject = 'You have received an invoice';

const InvoiceShareEmail: React.FC<InvoiceShareProps> = ({
  invoiceUrl,
  clientName = 'there',
  senderName = 'Your business partner',
  invoiceNumber,
  amount,
  dueDate,
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
          Invoice Management System
        </Text>
      </Section>

      {/* Main Content */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <Text style={{ ...components.text, fontSize: '18px' }}>
          Hello {clientName},
        </Text>

        <Text style={components.text}>
          <strong>{senderName}</strong> has sent you an invoice for payment.
        </Text>

        <Text style={components.text}>
          Please review the invoice details below. You can view the full invoice
          and make payment using the secure link provided.
        </Text>
      </Section>

      {/* Invoice Details */}
      <Section style={{ padding: `0 ${spacing.xl}` }}>
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: spacing.lg,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: spacing.md,
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
                Invoice {invoiceNumber && `#${invoiceNumber}`}
              </Text>
              <Text style={{ ...components.smallText, margin: '0' }}>
                Ready for payment
              </Text>
            </div>
          </div>

          {(amount || dueDate) && (
            <div
              style={{
                display: 'flex',
                gap: spacing.lg,
                flexWrap: 'wrap' as const,
              }}
            >
              {amount && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <DollarSignIcon size={16} />
                  <div>
                    <Text
                      style={{
                        ...components.smallText,
                        margin: '0',
                        fontWeight: '600',
                      }}
                    >
                      Amount Due
                    </Text>
                    <Text
                      style={{
                        ...components.text,
                        margin: '0',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1EC64C',
                      }}
                    >
                      ${amount}
                    </Text>
                  </div>
                </div>
              )}

              {dueDate && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#6b7280',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: 'white',
                      fontWeight: '600',
                    }}
                  >
                    {new Date(dueDate).getDate()}
                  </div>
                  <div>
                    <Text
                      style={{
                        ...components.smallText,
                        margin: '0',
                        fontWeight: '600',
                      }}
                    >
                      Due Date
                    </Text>
                    <Text style={{ ...components.text, margin: '0' }}>
                      {new Date(dueDate).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
              )}
            </div>
          )}
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
              This invoice is securely hosted on Potion's platform. You can pay
              online using various payment methods including credit card and
              bank transfer.
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
        <Button href={invoiceUrl} style={components.button}>
          View Invoice & Pay
        </Button>
      </Section>

      <Hr style={components.divider} />

      {/* Footer */}
      <Section
        style={{ padding: `0 ${spacing.xl} ${spacing.xl} ${spacing.xl}` }}
      >
        <Text style={components.footerText}>
          This invoice was sent via Potion's secure platform. If you have any
          questions about this invoice, please contact {senderName} directly.
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

export default InvoiceShareEmail;
