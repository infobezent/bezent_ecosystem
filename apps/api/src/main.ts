import { createApp } from './app/server/createApp.js';
import { assertProductionAuthConfig, env } from './app/config/env.js';
import { closePool, ensureDatabaseConnected, isDatabaseConfigured } from './db/connection.js';

assertProductionAuthConfig();

async function startServer(): Promise<void> {
  if (isDatabaseConfigured) {
    const { ok, diagnostic } = await ensureDatabaseConnected();
    if (!ok) {
      console.error(`[db] MySQL connection failed:\n${diagnostic}`);
      console.error('[api] Aborting startup: mandatory database is unavailable.');
      process.exit(1);
    }
    console.log('[db] MySQL connected');
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`[bezent-api] listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[bezent-api] received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await closePool();
      console.log('[bezent-api] shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    console.error('[bezent-api] Unhandled Rejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[bezent-api] Uncaught Exception:', err);
  });
}

void startServer();
