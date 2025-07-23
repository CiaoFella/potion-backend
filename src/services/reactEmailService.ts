import { render } from '@react-email/components';
import React from 'react';
import path from 'path';

interface EmailTemplate {
  subject: string;
  html: string;
}

interface BaseEmailProps {
  subject?: string;
  [key: string]: any;
}

class ReactEmailService {
  private templatesPath: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../templates/react-email');
  }

  /**
   * Render React Email template to HTML
   */
  async renderTemplate<T extends BaseEmailProps>(
    templateName: string,
    props: T,
  ): Promise<EmailTemplate> {
    try {
      // Dynamically import the template component
      // Try .tsx first (development), then .js (production)
      let templatePath = path.join(this.templatesPath, `${templateName}.tsx`);
      let TemplateModule;

      try {
        TemplateModule = await import(templatePath);
      } catch (error) {
        // Try .js extension for compiled code
        templatePath = path.join(this.templatesPath, `${templateName}.js`);
        TemplateModule = await import(templatePath);
      }
      const TemplateComponent = TemplateModule.default;

      if (!TemplateComponent) {
        throw new Error(`No default export found in template: ${templateName}`);
      }

      // Render the React component to HTML
      const html = await render(React.createElement(TemplateComponent, props));

      // Extract subject from props or component
      const subject = props.subject || TemplateModule.subject || `Email from Potion`;

      return { subject, html };
    } catch (error) {
      console.error(`Error rendering React Email template ${templateName}:`, error);
      throw new Error(`Failed to render email template: ${templateName}`);
    }
  }

  /**
   * Render template with validation
   */
  async renderTemplateWithValidation<T extends BaseEmailProps>(
    templateName: string,
    props: T,
    requiredProps: (keyof T)[] = [],
  ): Promise<EmailTemplate> {
    // Validate required props
    const missingProps = requiredProps.filter(
      (prop) => props[prop] === undefined || props[prop] === null || props[prop] === '',
    );

    if (missingProps.length > 0) {
      throw new Error(`Missing required props for ${templateName}: ${missingProps.join(', ')}`);
    }

    return this.renderTemplate(templateName, props);
  }

  /**
   * Get default props for all templates
   */
  getDefaultProps(): Partial<BaseEmailProps> {
    return {
      companyName: 'Potion',
      supportEmail: 'support@potionapp.com',
      logoUrl: 'https://go-potion.com/logo-white.png',
      currentYear: new Date().getFullYear(),
    };
  }
}

// Export singleton instance
export const reactEmailService = new ReactEmailService();

// Export types
export type { EmailTemplate, BaseEmailProps };
