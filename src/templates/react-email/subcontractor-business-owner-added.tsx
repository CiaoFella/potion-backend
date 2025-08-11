import React from 'react';
import { Heading, Text, Button, Section } from '@react-email/components';
import { Layout } from './_components/Layout';
import { components, statusBoxes } from './_styles/shared';
import {
  CheckCircleIcon,
  UsersIcon,
  FileTextIcon,
  InfoIcon,
} from './_components/Icons';

export interface SubcontractorBusinessOwnerAddedProps {
  firstName: string;
  businessOwnerName: string;
  businessOwnerBusinessName?: string;
  projectsCount?: number;
  projectNames?: string[];
  loginUrl?: string;
}

export const subject = 'New Business Owner Added - {{businessOwnerName}}';

const SubcontractorBusinessOwnerAddedEmail: React.FC<
  SubcontractorBusinessOwnerAddedProps
> = ({
  firstName,
  businessOwnerName,
  businessOwnerBusinessName,
  projectsCount,
  projectNames = [],
  loginUrl = 'https://my.potionapp.com/login',
}) => {
  return (
    <Layout
      preview={`Hi ${firstName}, ${businessOwnerName} has granted you access to their projects. You can now access their account using your existing Potion login.`}
    >
      <Heading style={components.mainHeading}>
        Hi {firstName.split(' ')[0]},
      </Heading>

      <div style={statusBoxes.success}>
        <CheckCircleIcon size={16} color="#059669" />
        <strong>{businessOwnerName}</strong>
        {businessOwnerBusinessName && ` from ${businessOwnerBusinessName}`} has
        granted you access to their projects.
      </div>

      <Text style={components.text}>
        You can now access their account using your existing Potion login
        credentials.
      </Text>

      {projectsCount && projectsCount > 0 && (
        <Text style={components.text}>
          <strong>
            You have access to {projectsCount} project
            {projectsCount > 1 ? 's' : ''}:
          </strong>
          {projectNames.length > 0 && (
            <>
              <br />
              {projectNames.slice(0, 3).join(', ')}
              {projectNames.length > 3 &&
                ` and ${projectNames.length - 3} more`}
            </>
          )}
        </Text>
      )}

      <Text style={components.text}>
        <strong>What you can do:</strong>
      </Text>

      <Section style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
          }}
        >
          <FileTextIcon size={16} color="#64748b" />
          <div>
            <Text
              style={{
                ...components.text,
                margin: '0 0 4px 0',
                fontWeight: '600',
              }}
            >
              Track Project Progress
            </Text>
            <Text
              style={{ ...components.smallText, margin: '0', color: '#64748b' }}
            >
              View project details, milestones, and deliverables
            </Text>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
          }}
        >
          <UsersIcon size={16} color="#64748b" />
          <div>
            <Text
              style={{
                ...components.text,
                margin: '0 0 4px 0',
                fontWeight: '600',
              }}
            >
              Collaborate with Team
            </Text>
            <Text
              style={{ ...components.smallText, margin: '0', color: '#64748b' }}
            >
              Communicate with the business owner and project team
            </Text>
          </div>
        </div>
      </Section>

      <Section style={components.buttonSection}>
        <Button href={loginUrl} style={components.button}>
          Login to Access Projects
        </Button>
      </Section>

      <Text style={components.smallText}>
        <strong>Need help?</strong> Just reply to this email - our support team
        is here to assist you.
      </Text>

      <div style={statusBoxes.info}>
        <InfoIcon size={16} color="#2563eb" />
        You can now manage multiple business owners from your Potion dashboard.
      </div>
    </Layout>
  );
};

export default SubcontractorBusinessOwnerAddedEmail;
