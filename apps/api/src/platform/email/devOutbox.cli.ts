/**
 * DEVELOPMENT ONLY — prints the latest email sent to an address through the
 * `outbox` transport, e.g. to read an Email OTP sign-in code locally:
 *
 *   npm run dev:mail --workspace=apps/api -- someone@example.com
 *
 * Refuses to run in production or when real SMTP delivery is configured, so it
 * can never be used to read codes that were sent to a real inbox.
 */
import { env } from '../../app/config/env.js';
import { closePool } from '../../db/connection.js';
import { emailOutboxRepository } from './repository/emailOutbox.repository.js';

async function main(): Promise<number> {
  if (env.nodeEnv === 'production' || env.email.transport !== 'outbox') {
    console.error('dev:mail is available only in development with EMAIL_TRANSPORT=outbox.');
    return 1;
  }
  const address = process.argv[2]?.trim().toLowerCase();
  if (!address) {
    console.error('Usage: npm run dev:mail --workspace=apps/api -- <email>');
    return 1;
  }
  const message = await emailOutboxRepository.latestFor(address);
  if (!message) {
    console.log(`No email in the development outbox for ${address}.`);
    return 0;
  }
  console.log(`To:      ${message.recipient}`);
  console.log(`Sent:    ${message.createdAt.toISOString()}`);
  console.log(`Subject: ${message.subject}\n`);
  console.log(message.bodyText);
  return 0;
}

main()
  .then(async (code) => {
    await closePool();
    process.exit(code);
  })
  .catch(async (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    await closePool();
    process.exit(1);
  });
