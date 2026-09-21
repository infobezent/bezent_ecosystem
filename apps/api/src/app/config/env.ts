import 'dotenv/config';

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function required(name: string, fallback: string): string {
  return optional(name) ?? fallback;
}

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: Number(required('API_PORT', '4000')),
  db: {
    url: optional('DATABASE_URL'),
    host: optional('DB_HOST'),
    port: optional('DB_PORT') ? Number(optional('DB_PORT')) : undefined,
    user: optional('DB_USER'),
    password: optional('DB_PASSWORD'),
    name: optional('DB_NAME'),
  },
};

/**
 * True when enough connection information is present to attempt a database
 * connection. Phase 0 must run without any database configured at all.
 */
export const isDatabaseConfigured = Boolean(
  env.db.url || (env.db.host && env.db.user && env.db.name),
);
