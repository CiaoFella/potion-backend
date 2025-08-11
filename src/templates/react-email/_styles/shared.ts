/**
 * Shared Email Styles
 *
 * Modern SaaS transactional email styling system following best practices
 * from companies like Stripe, Linear, and Notion.
 */

// Brand Colors - More subtle and professional
export const colors = {
  primary: '#1EC64C',
  primaryHover: '#17a441',
  secondary: '#f0f9ff',
  text: '#1f2937',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  background: '#ffffff',
  backgroundLight: '#f9fafb',
  white: '#ffffff',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',

  // Status Colors
  success: '#059669',
  successLight: '#d1fae5',
  warning: '#d97706',
  warningLight: '#fef3c7',
  error: '#dc2626',
  errorLight: '#fee2e2',
  info: '#2563eb',
  infoLight: '#dbeafe',
} as const;

// Typography - Clean and readable
export const typography = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',

  // Font Sizes
  h1: '24px',
  h2: '20px',
  h3: '18px',
  body: '16px',
  small: '14px',
  tiny: '12px',

  // Line Heights
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.625',

  // Font Weights
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// Spacing - Consistent 8px grid
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

// Layout Styles - Clean and minimal
export const layout = {
  body: {
    backgroundColor: colors.background,
    fontFamily: typography.fontFamily,
    margin: 0,
    padding: 0,
    lineHeight: typography.normal,
    color: colors.text,
  },

  container: {
    maxWidth: '580px',
    margin: '0 auto',
    backgroundColor: colors.white,
  },

  header: {
    padding: `${spacing.xl} ${spacing.xl} ${spacing.lg} ${spacing.xl}`,
    textAlign: 'left' as const,
  },

  content: {
    padding: 0,
  },

  footer: {
    backgroundColor: colors.backgroundLight,
    padding: `${spacing.lg} ${spacing.xl}`,
  },
} as const;

// Component Styles - Modern and clean
export const components = {
  logo: {
    height: '32px',
    marginBottom: spacing.md,
    display: 'block',
  },

  brandName: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    color: colors.text,
    margin: 0,
    letterSpacing: '-0.025em',
  },

  mainHeading: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: typography.bold,
    margin: `0 0 ${spacing.lg} 0`,
    lineHeight: typography.tight,
    letterSpacing: '-0.025em',
  },

  sectionHeading: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    margin: `${spacing.xl} 0 ${spacing.md} 0`,
    lineHeight: typography.tight,
  },

  text: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.normal,
    margin: `0 0 ${spacing.md} 0`,
  },

  textLarge: {
    color: colors.text,
    fontSize: '18px',
    lineHeight: typography.normal,
    margin: `0 0 ${spacing.md} 0`,
  },

  smallText: {
    color: colors.textLight,
    fontSize: typography.small,
    lineHeight: typography.normal,
    margin: `0 0 ${spacing.sm} 0`,
  },

  footerText: {
    fontSize: typography.small,
    color: colors.textMuted,
    margin: `0 0 ${spacing.sm} 0`,
    textAlign: 'left' as const,
  },

  link: {
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: typography.medium,
  },

  button: {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: `14px 28px`,
    borderRadius: '8px',
    fontSize: typography.body,
    fontWeight: typography.semibold,
    textDecoration: 'none',
    display: 'inline-block',
    lineHeight: '1',
    border: 'none',
    cursor: 'pointer',
  },

  buttonSecondary: {
    backgroundColor: colors.backgroundLight,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    padding: `13px 27px`,
    borderRadius: '8px',
    fontSize: typography.body,
    fontWeight: typography.medium,
    textDecoration: 'none',
    display: 'inline-block',
    lineHeight: '1',
    cursor: 'pointer',
  },

  buttonSection: {
    textAlign: 'left' as const,
    margin: `${spacing.xl} 0`,
  },

  divider: {
    borderTop: `1px solid ${colors.border}`,
    margin: `${spacing.xl} 0`,
    border: 'none',
    height: '1px',
    backgroundColor: colors.border,
  },

  listItem: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: typography.normal,
    margin: `0 0 ${spacing.sm} 0`,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '0',
  },

  listItemBullet: {
    display: 'flex',
    alignItems: 'center',
    marginRight: '2px',
    minWidth: '20px',
    justifyContent: 'flex-start',
    flexShrink: 0,
  },
} as const;

// Status Components - Subtle and clean
export const statusBoxes = {
  success: {
    backgroundColor: colors.successLight,
    border: `1px solid ${colors.success}20`,
    color: colors.success,
    padding: spacing.md,
    borderRadius: '8px',
    margin: `${spacing.lg} 0`,
    fontSize: typography.body,
    fontWeight: typography.medium,
  },

  warning: {
    backgroundColor: colors.warningLight,
    border: `1px solid ${colors.warning}20`,
    color: colors.warning,
    padding: spacing.md,
    borderRadius: '8px',
    margin: `${spacing.lg} 0`,
    fontSize: typography.body,
    fontWeight: typography.medium,
  },

  error: {
    backgroundColor: colors.errorLight,
    border: `1px solid ${colors.error}20`,
    color: colors.error,
    padding: spacing.md,
    borderRadius: '8px',
    margin: `${spacing.lg} 0`,
    fontSize: typography.body,
    fontWeight: typography.medium,
  },

  info: {
    backgroundColor: colors.infoLight,
    border: `1px solid ${colors.info}20`,
    color: colors.info,
    padding: spacing.md,
    borderRadius: '8px',
    margin: `${spacing.lg} 0`,
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
} as const;

// Special Components
export const special = {
  codeBlock: {
    backgroundColor: colors.backgroundLight,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    padding: spacing.md,
    fontFamily: 'Monaco, Consolas, "Lucida Console", monospace',
    fontSize: typography.small,
    color: colors.text,
    margin: `${spacing.md} 0`,
    wordBreak: 'break-all' as const,
  },

  statsCard: {
    backgroundColor: colors.backgroundLight,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: spacing.lg,
    margin: `${spacing.lg} 0`,
  },

  timeline: {
    borderLeft: `2px solid ${colors.border}`,
    paddingLeft: spacing.lg,
    marginLeft: spacing.sm,
  },

  badge: {
    display: 'inline-block',
    padding: `4px 12px`,
    borderRadius: '12px',
    fontSize: typography.small,
    fontWeight: typography.medium,
    backgroundColor: colors.backgroundLight,
    color: colors.textLight,
    border: `1px solid ${colors.border}`,
  },
} as const;

// Utility functions
export const utils = {
  /**
   * Create consistent margin for text elements
   */
  spacing: (top = spacing.md, bottom = spacing.md) => ({
    margin: `${top} 0 ${bottom} 0`,
  }),

  /**
   * Create button with custom colors
   */
  customButton: (
    backgroundColor = colors.primary,
    textColor = colors.white,
  ) => ({
    ...components.button,
    backgroundColor,
    color: textColor,
  }),

  /**
   * Create status box with custom colors
   */
  customStatusBox: (
    bgColor: string,
    borderColor: string,
    textColor: string,
  ) => ({
    backgroundColor: bgColor,
    border: `1px solid ${borderColor}20`,
    color: textColor,
    padding: spacing.md,
    borderRadius: '8px',
    margin: `${spacing.lg} 0`,
    fontSize: typography.body,
    fontWeight: typography.medium,
  }),
} as const;

// Legacy aliases for backward compatibility
export const alerts = statusBoxes;
