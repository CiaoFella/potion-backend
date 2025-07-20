import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Img,
  Heading,
  Text,
  Link,
} from '@react-email/components';
import React from 'react';
import { layout, components, special } from '../_styles/shared';

interface LayoutProps {
  children: React.ReactNode;
  preview?: string;
  headerTitle?: string;
  companyName?: string;
  logoUrl?: string;
  supportEmail?: string;
  currentYear?: number;
  headerStyle?: React.CSSProperties;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  preview = 'Email from Potion',
  headerTitle = 'Potion',
  companyName = 'Potion',
  logoUrl = 'https://go-potion.com/logo-white.png',
  supportEmail = 'support@potionapp.com',
  currentYear = new Date().getFullYear(),
  headerStyle,
}) => {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}

      <Body style={layout.body}>
        <Container style={layout.container}>
          {/* Header */}
          <div style={headerStyle || layout.header}>
            <Img src={logoUrl} alt={companyName} style={components.logo} />
            <Heading style={components.headerTitle}>{headerTitle}</Heading>
          </div>

          {/* Content */}
          <div style={layout.content}>{children}</div>

          {/* Footer */}
          <div style={layout.footer}>
            <Text style={components.footerText}>
              Need help? Contact us at{' '}
              <Link href={`mailto:${supportEmail}`} style={components.link}>
                {supportEmail}
              </Link>
            </Text>
            <Text style={components.footerText}>
              {companyName} • Building the future of business automation
            </Text>
            <Text style={components.footerSmall}>
              You received this email because you have an account with{' '}
              {companyName}.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  );
};
