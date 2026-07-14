export type EmailProvider = 'resend' | 'smtp' | 'disabled';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider?: EmailProvider;
  id?: string;
  error?: string;
  skipped?: boolean;
}
