import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
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
  const options: mysql.PoolOptions = env.db.url
    ? { uri: env.db.url }
    : {
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
        database: env.db.name,
        waitForConnections: true,
        connectionLimit: 10,
      };

  const poolInstance = mysql.createPool({
    ...options,
    timezone: 'Z',
    dateStrings: true,
  });

  poolInstance.on('connection', (connection: mysql.PoolConnection) => {
    connection.query("SET time_zone = '+00:00'");
  });

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

export async function pingDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured) {
    return false;
  }
  try {
    const connection = await getPool().getConnection();
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

function tryStartLocalMysqld(): boolean {
  if (process.platform !== 'win32') return false;
  const mysqldPath = 'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe';
  const dataDir = 'C:\\ProgramData\\MySQL\\bezent_dev_data';
  if (!existsSync(mysqldPath) || !existsSync(dataDir)) return false;
  try {
    const child = spawn(mysqldPath, [`--datadir=${dataDir}`, '--port=3306'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

export async function ensureDatabaseConnected(): Promise<{ ok: boolean; diagnostic?: string }> {
  let result = await checkDatabaseConnection();
  if (result.ok) {
    return { ok: true };
  }

  if (env.nodeEnv === 'development' && result.code === 'ECONNREFUSED') {
    const started = tryStartLocalMysqld();
    if (started) {
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        result = await checkDatabaseConnection();
        if (result.ok) {
          return { ok: true };
        }
      }
    }
  }

  const host = env.db.host ?? 'localhost';
  const port = env.db.port ?? 3306;
  const dbName = env.db.name ?? 'unknown';
  const diagnostic =
    `Could not connect to MySQL at ${host}:${port} (database: ${dbName}).\n` +
    `  Reason: ${result.error || 'Connection failed'} (${result.code || 'UNKNOWN'}).\n` +
    `  Please ensure MySQL Server 8.4 is running on port ${port}.`;

  return { ok: false, diagnostic };
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
