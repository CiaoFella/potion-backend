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
import { layout, components, colors } from '../_styles/shared';

interface LayoutProps {
  children: React.ReactNode;
  preview?: string;
  companyName?: string;
  logoUrl?: string;
  supportEmail?: string;
  showLogo?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  preview = 'Email from Potion',
  companyName = 'Potion',
  logoUrl = 'https://my.potionapp.com/logo.svg',
  supportEmail = 'support@potionapp.com',
  showLogo = true,
}) => {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}

      <Body style={layout.body}>
        <Container style={layout.container}>
          {/* Header */}
          <div style={layout.header}>
            {showLogo && (
              <Img src={logoUrl} alt={companyName} style={components.logo} />
            )}
            {!showLogo && (
              <Heading style={components.brandName}>{companyName}</Heading>
            )}
          </div>

          {/* Content */}
          <div style={layout.content}>{children}</div>

          {/* Footer */}
          <div style={layout.footer}>
            <Text style={components.footerText}>
              Need help?{' '}
              <Link href={`mailto:${supportEmail}`} style={components.link}>
                Contact support
              </Link>
            </Text>
            <Text style={components.footerText}>
              © {new Date().getFullYear()} {companyName} - Building the future
              of business automation
            </Text>
            <Text
              style={{
                ...components.footerText,
                fontSize: '12px',
                color: colors.textMuted,
              }}
            >
              You received this email because you have an account with{' '}
              {companyName}.
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  );
};
