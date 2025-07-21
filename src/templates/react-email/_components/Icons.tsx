import React from 'react';
import {
  Check,
  AlertTriangle,
  Clock,
  Mail,
  DollarSign,
  Users,
  BarChart3,
  Sparkles,
  Info,
  CheckCircle,
  Calendar,
  FileText,
  Settings,
  Star,
} from 'lucide-react';

// Base icon props
interface IconProps {
  size?: number;
  color?: string;
}

// Shared icon wrapper style for consistent spacing
const iconWrapperStyle = {
  display: 'inline-block' as const,
  verticalAlign: 'middle' as const,
  marginRight: '6px',
};

// Success/Check Icons
export const CheckIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#059669',
}) => (
  <span style={iconWrapperStyle}>
    <Check size={size} color={color} />
  </span>
);

export const CheckCircleIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#059669',
}) => (
  <span style={iconWrapperStyle}>
    <CheckCircle size={size} color={color} />
  </span>
);

export const SparklesIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#059669',
}) => (
  <span style={iconWrapperStyle}>
    <Sparkles size={size} color={color} />
  </span>
);

// Warning/Alert Icons
export const WarningIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#d97706',
}) => (
  <span style={iconWrapperStyle}>
    <AlertTriangle size={size} color={color} />
  </span>
);

export const InfoIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#2563eb',
}) => (
  <span style={iconWrapperStyle}>
    <Info size={size} color={color} />
  </span>
);

// Time/Clock Icons
export const ClockIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#d97706',
}) => (
  <span style={iconWrapperStyle}>
    <Clock size={size} color={color} />
  </span>
);

// Business/Feature Icons
export const MailIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#1f2937',
}) => (
  <span style={iconWrapperStyle}>
    <Mail size={size} color={color} />
  </span>
);

export const DollarSignIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#1f2937',
}) => (
  <span style={iconWrapperStyle}>
    <DollarSign size={size} color={color} />
  </span>
);

export const UsersIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#1f2937',
}) => (
  <span style={iconWrapperStyle}>
    <Users size={size} color={color} />
  </span>
);

export const BarChartIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#1f2937',
}) => (
  <span style={iconWrapperStyle}>
    <BarChart3 size={size} color={color} />
  </span>
);

export const FileTextIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#1f2937',
}) => (
  <span style={iconWrapperStyle}>
    <FileText size={size} color={color} />
  </span>
);

export const SettingsIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#1f2937',
}) => (
  <span style={iconWrapperStyle}>
    <Settings size={size} color={color} />
  </span>
);

export const CalendarIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#1f2937',
}) => (
  <span style={iconWrapperStyle}>
    <Calendar size={size} color={color} />
  </span>
);

export const StarIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#1f2937',
}) => (
  <span style={iconWrapperStyle}>
    <Star size={size} color={color} />
  </span>
);

// Simple bullet point replacement
export const BulletIcon: React.FC<IconProps> = ({
  size = 6,
  color = '#1EC64C',
}) => (
  <span
    style={{
      display: 'inline-block',
      width: `${size}px`,
      height: `${size}px`,
      backgroundColor: color,
      borderRadius: '50%',
      marginRight: '10px',
      marginLeft: '2px',
      verticalAlign: 'middle',
    }}
  />
);

// Status components with icons for emails
export const SuccessStatus: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span>
    <CheckCircleIcon size={16} color="#059669" />
    {children}
  </span>
);

export const WarningStatus: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span>
    <WarningIcon size={16} color="#d97706" />
    {children}
  </span>
);

export const InfoStatus: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span>
    <InfoIcon size={16} color="#2563eb" />
    {children}
  </span>
);

export const ClockStatus: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span>
    <ClockIcon size={16} color="#d97706" />
    {children}
  </span>
);
