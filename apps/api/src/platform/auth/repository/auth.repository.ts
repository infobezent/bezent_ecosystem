import { eq, and, gt, isNull, or } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { users, sessions, memberships, companies, tenants, type User, type Session } from '../../../db/schema.js';
import { generateSurrogateId, hashSessionToken } from '../security.js';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()));
    return user ?? null;
  }

  async findUserById(id: string): Promise<User | null> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  /**
   * Resolves a bearer token. New sessions are stored as `sha256:<hex>`; rows
   * created before ADR-018 hold the raw token and still match until they
   * expire. Callers must pass only well-formed tokens (64 hex chars), so a
   * stored digest can never be replayed as a bearer token.
   */
  async findActiveSession(token: string): Promise<(Session & { user: User }) | null> {
    const db = getDb();
    const rows = await db
      .select({
        session: sessions,
        user: users,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          this.matchesToken(token),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      );

    const row = rows[0];
    if (!row) return null;
    return {
      ...row.session,
      user: row.user,
    };
  }

  async createSession(userId: string, token: string, expiresAt: Date): Promise<Session> {
    const db = getDb();
    const id = generateSurrogateId('sess');
    await db.insert(sessions).values({
      id,
      token: hashSessionToken(token),
      userId,
      expiresAt,
    });
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    if (!session) throw new Error('Failed to create session');
    return session;
  }

  async revokeSession(token: string): Promise<void> {
    const db = getDb();
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(this.matchesToken(token));
  }

  private matchesToken(token: string) {
    return or(eq(sessions.token, hashSessionToken(token)), eq(sessions.token, token));
  }

  async updateLastLogin(userId: string): Promise<void> {
    const db = getDb();
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getUserMemberships(userId: string) {
    const db = getDb();
    return db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        tenantId: memberships.tenantId,
        companyId: memberships.companyId,
        role: memberships.role,
        status: memberships.status,
        companyName: companies.name,
        companyCode: companies.code,
        companyStatus: companies.status,
        tenantName: tenants.name,
        tenantStatus: tenants.status,
      })
      .from(memberships)
      .leftJoin(companies, eq(memberships.companyId, companies.id))
      .leftJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, 'active')));
  }
}

export const authRepository = new AuthRepository();
