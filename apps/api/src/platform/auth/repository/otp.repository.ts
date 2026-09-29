import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { authOtpChallenges, type AuthOtpChallenge } from '../../../db/schema.js';

/** Data access for Email OTP challenges (ADR-018). */
export class OtpRepository {
  async create(row: {
    id: string;
    userId: string | null;
    email: string;
    codeDigest: string | null;
    expiresAt: Date;
    requestIp: string | null;
  }): Promise<AuthOtpChallenge> {
    const db = getDb();
    await db.insert(authOtpChallenges).values({ ...row, status: 'pending', attempts: 0 });
    const [created] = await db
      .select()
      .from(authOtpChallenges)
      .where(eq(authOtpChallenges.id, row.id));
    if (!created) throw new Error('Failed to create OTP challenge');
    return created;
  }

  async findById(id: string): Promise<AuthOtpChallenge | null> {
    const [row] = await getDb()
      .select()
      .from(authOtpChallenges)
      .where(eq(authOtpChallenges.id, id));
    return row ?? null;
  }

  async latestForEmail(email: string): Promise<AuthOtpChallenge | null> {
    const [row] = await getDb()
      .select()
      .from(authOtpChallenges)
      .where(eq(authOtpChallenges.email, email))
      .orderBy(desc(authOtpChallenges.createdAt))
      .limit(1);
    return row ?? null;
  }

  async countForEmailSince(email: string, since: Date): Promise<number> {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)` })
      .from(authOtpChallenges)
      .where(and(eq(authOtpChallenges.email, email), gte(authOtpChallenges.createdAt, since)));
    return Number(row?.count ?? 0);
  }

  async countForIpSince(ip: string, since: Date): Promise<number> {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)` })
      .from(authOtpChallenges)
      .where(and(eq(authOtpChallenges.requestIp, ip), gte(authOtpChallenges.createdAt, since)));
    return Number(row?.count ?? 0);
  }

  /**
   * Records one verification attempt atomically, only while the challenge is
   * pending. Returns the attempt count after the increment, or null when the
   * challenge was no longer pending.
   */
  async recordAttempt(id: string): Promise<number | null> {
    const db = getDb();
    const [result] = await db
      .update(authOtpChallenges)
      .set({ attempts: sql`${authOtpChallenges.attempts} + 1` })
      .where(and(eq(authOtpChallenges.id, id), eq(authOtpChallenges.status, 'pending')));
    if (result.affectedRows !== 1) return null;
    const row = await this.findById(id);
    return row?.attempts ?? null;
  }

  /** Single use: only one caller can move a pending challenge to consumed. */
  async consume(id: string): Promise<boolean> {
    const [result] = await getDb()
      .update(authOtpChallenges)
      .set({ status: 'consumed', consumedAt: new Date() })
      .where(and(eq(authOtpChallenges.id, id), eq(authOtpChallenges.status, 'pending')));
    return result.affectedRows === 1;
  }

  async setStatus(id: string, status: 'locked' | 'expired'): Promise<void> {
    await getDb()
      .update(authOtpChallenges)
      .set({ status })
      .where(and(eq(authOtpChallenges.id, id), eq(authOtpChallenges.status, 'pending')));
  }
}

export const otpRepository = new OtpRepository();
