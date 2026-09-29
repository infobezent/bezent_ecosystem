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
}

export const emailService = new EmailService();
