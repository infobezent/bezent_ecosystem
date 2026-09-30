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

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
