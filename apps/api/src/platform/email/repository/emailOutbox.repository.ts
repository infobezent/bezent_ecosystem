import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { emailOutbox, type EmailOutboxMessage } from '../../../db/schema.js';
import { generateSurrogateId } from '../../auth/security.js';
import type { EmailMessage } from '../types/email.types.js';

/** Development/test outbox (ADR-018). Never used in production. */
export class EmailOutboxRepository {
  async record(message: EmailMessage): Promise<void> {
    await getDb()
      .insert(emailOutbox)
      .values({
        id: generateSurrogateId('mail'),
        recipient: message.to.toLowerCase(),
        subject: message.subject,
        bodyText: message.text,
      });
  }

  async latestFor(recipient: string): Promise<EmailOutboxMessage | null> {
    const [row] = await getDb()
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.recipient, recipient.toLowerCase()))
      .orderBy(desc(emailOutbox.createdAt))
      .limit(1);
    return row ?? null;
  }
}

export const emailOutboxRepository = new EmailOutboxRepository();
