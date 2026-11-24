import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { env, isDatabaseConfigured } from '../app/config/env.js';
import { DatabaseConnectionError } from '../app/errors/AppError.js';

export { isDatabaseConfigured };

/**
 * Lazily-created MySQL connection pool + Drizzle instance.
 *
 * Callers requiring database persistence must treat database configuration
 * and availability as mandatory. If unconfigured or unreachable, calls fail
 * clearly through DatabaseConnectionError.
 */

let pool: mysql.Pool | undefined;

function createPool(): mysql.Pool {
  let options: mysql.PoolOptions;

  if (env.db.url) {
    try {
      const parsed = new URL(env.db.url);
      const isSsl =
        parsed.searchParams.get('ssl-mode')?.toUpperCase() === 'REQUIRED' ||
        parsed.searchParams.get('ssl') === 'true' ||
        parsed.hostname.includes('.aivencloud.com');
      parsed.searchParams.delete('ssl-mode');
      options = {
        uri: parsed.toString(),
        ...(isSsl ? { ssl: { rejectUnauthorized: false } } : {}),
      };
    } catch {
      options = { uri: env.db.url };
    }
  } else {
    options = {
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.name,
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    };
  }

  const poolInstance = mysql.createPool({
    ...options,
    timezone: 'Z',
    dateStrings: true,
  });

  poolInstance.on('connection', (connection: unknown) => {
    if (
      connection &&
      typeof connection === 'object' &&
      'query' in connection &&
      typeof (connection as { query: unknown }).query === 'function'
    ) {
      (
        connection as {
          query: (sql: string, cb: (err: unknown) => void) => void;
        }
      ).query("SET time_zone = '+00:00'", (err: unknown) => {
        if (err) {
          console.warn(
            '[db] Failed to set connection time zone:',
            err instanceof Error ? err.message : String(err),
          );
        }
      });
    }
  });

  (poolInstance as unknown as { on(event: string, listener: (err: unknown) => void): void }).on(
    'error',
    (err: unknown) => {
      console.error(
        '[db] MySQL connection pool error:',
        err instanceof Error ? err.message : String(err),
      );
    },
  );

  return poolInstance;
}

export function getPool(): mysql.Pool {
  if (!isDatabaseConfigured) {
    throw new DatabaseConnectionError('Database is not configured');
  }
  pool ??= createPool();
  return pool;
}

export function getDb() {
  return drizzle(getPool());
}

export async function pingDatabase(poolGetter: () => mysql.Pool = getPool): Promise<boolean> {
  if (!isDatabaseConfigured) {
    return false;
  }
  try {
    const connection = await poolGetter().getConnection();
    try {
      await connection.ping();
      return true;
    } finally {
      connection.release();
    }
  } catch {
    return false;
  }
}

export interface DbCheckResult {
  ok: boolean;
  error?: string;
  code?: string;
}

export async function checkDatabaseConnection(): Promise<DbCheckResult> {
  if (!isDatabaseConfigured) {
    return { ok: false, error: 'Database is not configured' };
  }
  try {
    const connection = await getPool().getConnection();
    try {
      await connection.ping();
      return { ok: true };
    } finally {
      connection.release();
    }
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: unknown }).code)
        : undefined;
    const rawMsg = err instanceof Error ? err.message : String(err);
    const sanitizedMsg = rawMsg.replace(/:\/\/[^:]+:([^@]+)@/, '://***:***@');
    return { ok: false, error: sanitizedMsg, code };
  }
}

export interface EnsureDatabaseConnectedOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  checker?: () => Promise<DbCheckResult>;
}

export async function ensureDatabaseConnected(
  options: EnsureDatabaseConnectedOptions = {},
): Promise<{ ok: boolean; diagnostic?: string }> {
  const maxRetries = options.maxRetries ?? (env.nodeEnv === 'development' ? 15 : 3);
  const initialDelayMs = options.initialDelayMs ?? (env.nodeEnv === 'development' ? 1000 : 500);
  const maxDelayMs = options.maxDelayMs ?? 2000;
  const check = options.checker ?? checkDatabaseConnection;

  let result: DbCheckResult = { ok: false, error: 'Uninitialized' };
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    result = await check();
    if (result.ok) {
      return { ok: true };
    }

    if (attempt < maxRetries) {
      console.warn(
        `[db] Connection attempt ${attempt}/${maxRetries} failed: ${result.error ?? 'Unknown error'} (${result.code ?? 'UNKNOWN'}). Retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, maxDelayMs);
    }
  }

  let host = env.db.host ?? 'localhost';
  let port = env.db.port ?? 3306;
  let dbName = env.db.name ?? 'unknown';

  if (env.db.url) {
    try {
      const u = new URL(env.db.url);
      host = u.hostname || host;
      port = u.port ? Number(u.port) : port;
      dbName = u.pathname.replace(/^\//, '') || dbName;
    } catch {
      // Keep fallbacks
    }
  }

  const isCloudHost = typeof host === 'string' && host.includes('.');
  const diagnostic =
    `Could not connect to MySQL at ${host}:${port} (database: ${dbName}) after ${maxRetries} attempts.\n` +
    `  Reason: ${result.error || 'Connection failed'} (${result.code || 'UNKNOWN'}).\n` +
    (isCloudHost && result.code === 'ENOTFOUND'
      ? `  Cloud host '${host}' could not be resolved. Please verify the database is active/powered on in your cloud console (e.g. Aiven) and DATABASE_URL in Render is up to date.`
      : `  Please ensure MySQL Server 8.4 is running on port ${port}. Run 'npm run db:start' to start it.`);

  return { ok: false, diagnostic };
}

export async function closePool(): Promise<void> {
  if (pool) {
    const p = pool;
    pool = undefined;
    try {
      await p.end();
    } catch (err) {
      console.warn(
        '[db] Error closing MySQL pool:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
