import { Resend } from "resend";
import { config } from "../config/config";

const resend = new Resend(config.resendApiKey);

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await resend.emails.send({
      from: config.emailFrom,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });
  } catch (error) {
    console.error("Error sending email:", error);
    // throw new Error("Failed to send email");
  }
};
