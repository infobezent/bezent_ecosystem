import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { env, isDatabaseConfigured } from '../app/config/env.js';

export { isDatabaseConfigured };

/**
 * Lazily-created MySQL connection pool + Drizzle instance.
 *
 * Phase 0 intentionally ships with no business schema, so nothing here
 * requires the database to be reachable at startup. Callers (currently just
 * the health endpoint) must treat the database as optional and handle
 * `getDb()` throwing or a ping failing gracefully.
 */

let pool: mysql.Pool | undefined;

function createPool(): mysql.Pool {
  if (env.db.url) {
    return mysql.createPool(env.db.url);
  }

  return mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

export function getPool(): mysql.Pool {
  if (!isDatabaseConfigured) {
    throw new Error('Database is not configured (see .env.example for required variables).');
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
