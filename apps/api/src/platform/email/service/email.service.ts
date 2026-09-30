import nodemailer from 'nodemailer';
import { env } from '../../../app/config/env.js';
import {
  emailOutboxRepository,
  EmailOutboxRepository,
} from '../repository/emailOutbox.repository.js';
import type { EmailMessage, EmailTransport } from '../types/email.types.js';

/** Delivers over SMTP (production). */
class SmtpTransport implements EmailTransport {
  private readonly transporter = nodemailer.createTransport({
    host: env.email.smtp.host,
    port: env.email.smtp.port,
    secure: env.email.smtp.secure,
    auth: env.email.smtp.user
      ? { user: env.email.smtp.user, pass: env.email.smtp.password }
      : undefined,
  });

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: env.email.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}

/** Stores messages in `email_outbox` (development and tests only). */
class OutboxTransport implements EmailTransport {
  constructor(private readonly outbox: EmailOutboxRepository) {}

  async send(message: EmailMessage): Promise<void> {
    await this.outbox.record(message);
    if (env.nodeEnv !== 'production') {
      console.log(`\n📬 [DEV EMAIL OUTBOX]`);
      console.log(`To:      ${message.to}`);
      console.log(`Subject: ${message.subject}`);
      console.log(`Message: ${message.text}\n`);
    }
  }
}

/**
 * Platform email delivery (ADR-018). The transport is chosen by
 * EMAIL_TRANSPORT; `assertProductionAuthConfig` guarantees SMTP in production.
 * Failures propagate to the caller — delivery is never silently skipped.
 */
export class EmailService {
  private transport: EmailTransport | undefined;

  constructor(
    private readonly outbox: EmailOutboxRepository = emailOutboxRepository,
    transport?: EmailTransport,
  ) {
    this.transport = transport;
  }

  async send(message: EmailMessage): Promise<void> {
    this.transport ??=
      env.email.transport === 'smtp' ? new SmtpTransport() : new OutboxTransport(this.outbox);
    await this.transport.send(message);
  }

  /**
   * Tells a user they were given access and how to sign in (Email OTP; no
   * password is ever issued). Used after the access itself is committed, so a
   * delivery failure is reported to the caller rather than undoing the grant.
   */
  async sendSignInInvitation(input: {
    to: string;
    firstName: string;
    companyName: string;
    roleLabel: string;
  }): Promise<'sent' | 'failed'> {
    const loginUrl = `${env.webAppUrl.replace(/\/+$/, '')}/login`;
    try {
      await this.send({
        to: input.to,
        subject: `You have been given access to ${input.companyName} on BEZENT`,
        text:
          `Hello ${input.firstName},\n\n` +
          `You have been given ${input.roleLabel} access to ${input.companyName} on BEZENT.\n\n` +
          `Sign in at ${loginUrl} with this email address (${input.to}). ` +
          'BEZENT will email you a one-time code; no password is needed.',
      });
      return 'sent';
    } catch {
      return 'failed';
    }
  }
}

export const emailService = new EmailService();
