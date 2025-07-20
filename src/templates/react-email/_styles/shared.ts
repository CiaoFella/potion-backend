/**
 * Shared Email Styles
 *
 * Centralized styling system for all React Email templates.
 * Update styles here to change appearance across all emails.
 */

// Brand Colors
export const colors = {
  primary: '#1EC64C',
  primaryHover: '#17a441',
  secondary: '#71F065',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#6c757d',
  background: '#f8f9fa',
  white: '#ffffff',
  border: '#eeeeee',

  // Status Colors
  success: '#28a745',
  warning: '#ffc107',
  warningBackground: '#fff3cd',
  warningBorder: '#ffeaa7',
  warningText: '#856404',
  error: '#dc3545',
  errorBackground: '#f8d7da',
  errorBorder: '#f5c6cb',
  errorText: '#721c24',
  info: '#17a2b8',
  infoBackground: '#e7f3ff',
  infoBorder: '#b3d9ff',
  infoText: '#0056b3',
} as const;

// Typography
export const typography = {
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,sans-serif',

  // Font Sizes
  h1: '28px',
  h2: '24px',
  h3: '20px',
  body: '16px',
  small: '14px',
  tiny: '12px',

  // Line Heights
  headingLineHeight: '1.2',
  bodyLineHeight: '1.5',

  // Font Weights
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// Spacing
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '20px',
  xl: '30px',
  xxl: '40px',
} as const;

// Layout Styles
export const layout = {
  body: {
    backgroundColor: colors.background,
    fontFamily: typography.fontFamily,
    margin: 0,
    padding: 0,
  },

  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: colors.white,
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },

  header: {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    color: colors.white,
    padding: spacing.xl,
    textAlign: 'center' as const,
  },

  content: {
    padding: `${spacing.xxl} ${spacing.xl}`,
  },

  footer: {
    backgroundColor: colors.background,
    padding: spacing.xl,
    textAlign: 'center' as const,
  },
} as const;

// Component Styles
export const components = {
  logo: {
    height: '32px',
    marginBottom: '10px',
  },

  headerTitle: {
    margin: 0,
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.white,
  },

  mainHeading: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: typography.semibold,
    margin: `0 0 ${spacing.lg} 0`,
  },

  sectionHeading: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    margin: `${spacing.lg} 0 ${spacing.md} 0`,
  },

  text: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.bodyLineHeight,
    margin: `${spacing.md} 0`,
  },

  smallText: {
    color: colors.textLight,
    fontSize: typography.small,
    lineHeight: typography.bodyLineHeight,
    margin: `${spacing.md} 0`,
  },

  footerText: {
    fontSize: typography.small,
    color: colors.textMuted,
    margin: `${spacing.sm} 0`,
  },

  footerSmall: {
    fontSize: typography.tiny,
    color: colors.textMuted,
    margin: `${spacing.sm} 0`,
  },

  link: {
    color: colors.primary,
    textDecoration: 'none',
  },

  button: {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: `${typography.small} ${spacing.xl}`,
    borderRadius: '6px',
    fontSize: typography.body,
    fontWeight: typography.semibold,
    textDecoration: 'none',
    display: 'inline-block',
  },

  buttonSection: {
    textAlign: 'center' as const,
    margin: `${spacing.xl} 0`,
  },

  hr: {
    borderColor: colors.border,
    borderTop: `1px solid ${colors.border}`,
    margin: `${spacing.xl} 0`,
  },

  featureItem: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.bodyLineHeight,
    margin: `${spacing.sm} 0`,
    paddingLeft: '0',
  },
} as const;

// Status Alert Boxes
export const alerts = {
  success: {
    backgroundColor: '#d4edda',
    border: '1px solid #c3e6cb',
    color: '#155724',
    padding: '15px',
    borderRadius: '6px',
    margin: `${spacing.lg} 0`,
    textAlign: 'center' as const,
  },

  warning: {
    backgroundColor: colors.warningBackground,
    border: `1px solid ${colors.warningBorder}`,
    color: colors.warningText,
    padding: '15px',
    borderRadius: '6px',
    margin: `${spacing.lg} 0`,
    textAlign: 'center' as const,
  },

  error: {
    backgroundColor: colors.errorBackground,
    border: `1px solid ${colors.errorBorder}`,
    color: colors.errorText,
    padding: '15px',
    borderRadius: '6px',
    margin: `${spacing.lg} 0`,
    textAlign: 'center' as const,
  },

  info: {
    backgroundColor: colors.infoBackground,
    border: `1px solid ${colors.infoBorder}`,
    color: colors.infoText,
    padding: '15px',
    borderRadius: '6px',
    margin: `${spacing.lg} 0`,
    textAlign: 'center' as const,
  },
} as const;

// Special Component Styles
export const special = {
  urgencyBox: alerts.warning,

  timer: {
    background: `linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)`,
    color: colors.white,
    padding: spacing.lg,
    borderRadius: '6px',
    margin: `${spacing.lg} 0`,
    textAlign: 'center' as const,
    fontSize: '18px',
    fontWeight: typography.semibold,
  },

  stats: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: '6px',
    margin: `${spacing.lg} 0`,
  },

  pricingHighlight: {
    color: colors.primary,
    fontSize: typography.body,
    fontWeight: typography.semibold,
    margin: `${spacing.lg} 0`,
  },

  errorHeader: {
    background: `linear-gradient(135deg, ${colors.error} 0%, #c82333 100%)`,
    color: colors.white,
    padding: spacing.xl,
    textAlign: 'center' as const,
  },

  warningHeader: {
    background: `linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)`,
    color: colors.white,
    padding: spacing.xl,
    textAlign: 'center' as const,
  },
} as const;

// Utility functions for dynamic styles
export const utils = {
  /**
   * Create consistent margin for text elements
   */
  textMargin: (top = spacing.md, bottom = spacing.md) => ({
    margin: `${top} 0 ${bottom} 0`,
  }),

  /**
   * Create button with custom color
   */
  customButton: (backgroundColor = colors.primary, textColor = colors.white) => ({
    ...components.button,
    backgroundColor,
    color: textColor,
  }),

  /**
   * Create alert box with custom colors
   */
  customAlert: (bgColor: string, borderColor: string, textColor: string) => ({
    backgroundColor: bgColor,
    border: `1px solid ${borderColor}`,
    color: textColor,
    padding: '15px',
    borderRadius: '6px',
    margin: `${spacing.lg} 0`,
    textAlign: 'center' as const,
  }),
} as const;
