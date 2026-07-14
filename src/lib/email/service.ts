import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { SendEmailInput, SendEmailResult, EmailProvider } from './types';

// Cache client and transporter instances
let resendClient: Resend | null = null;
let smtpTransport: nodemailer.Transporter | null = null;

function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER;
  if (provider === 'resend' || provider === 'smtp') {
    return provider;
  }
  return 'disabled';
}

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getSMTPTransport(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host || host.trim() === '') {
    return null;
  }
  
  if (!smtpTransport) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    const auth = user && pass ? { user, pass } : undefined;

    smtpTransport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
    });
  }
  return smtpTransport;
}

/**
 * Sends an email using the configured provider (Resend or SMTP).
 * Fallbacks to disabled mode if not configured or if explicitly disabled.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = getEmailProvider();

  if (provider === 'disabled') {
    return {
      success: false,
      skipped: true,
      provider: 'disabled',
      error: 'Email provider is disabled.',
    };
  }

  if (provider === 'resend') {
    const client = getResendClient();
    if (!client) {
      return {
        success: false,
        skipped: true,
        provider: 'resend',
        error: 'Resend API key is missing.',
      };
    }

    const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'sodeOS <noreply@example.com>';

    try {
      const { data, error } = await client.emails.send({
        from: fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      });

      if (error) {
        console.error('[sendEmail] Resend API error:', error.message || error);
        return {
          success: false,
          provider: 'resend',
          error: error.message || 'Error occurred while sending email via Resend.',
        };
      }

      return {
        success: true,
        provider: 'resend',
        id: data?.id,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      console.error('[sendEmail] Unexpected Resend error:', errorMessage);
      return {
        success: false,
        provider: 'resend',
        error: errorMessage,
      };
    }
  }

  if (provider === 'smtp') {
    const transport = getSMTPTransport();
    if (!transport) {
      return {
        success: false,
        skipped: true,
        provider: 'smtp',
        error: 'SMTP host configuration is missing.',
      };
    }

    const fromAddress =
      process.env.SMTP_FROM_ADDRESS ||
      process.env.EMAIL_FROM_ADDRESS ||
      'sodeOS <noreply@example.com>';

    try {
      const info = await transport.sendMail({
        from: fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      });

      return {
        success: true,
        provider: 'smtp',
        id: info.messageId,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown SMTP connection error';
      console.error('[sendEmail] SMTP error:', errorMessage);
      return {
        success: false,
        provider: 'smtp',
        error: errorMessage,
      };
    }
  }

  return {
    success: false,
    skipped: true,
    provider: 'disabled',
    error: 'Invalid email provider configuration.',
  };
}
