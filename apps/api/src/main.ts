import { createApp } from './app/server/createApp.js';
import { assertProductionAuthConfig, env } from './app/config/env.js';
import { ensureDatabaseConnected, isDatabaseConfigured } from './db/connection.js';

assertProductionAuthConfig();

async function startServer(): Promise<void> {
  if (isDatabaseConfigured) {
    const { ok, diagnostic } = await ensureDatabaseConnected();
    if (ok) {
      console.log('[db] MySQL connected');
    } else {
      console.error(`[db] MySQL connection failed:\n${diagnostic}`);
      if (env.nodeEnv === 'production') {
        process.exit(1);
      }
    }
  }

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[bezent-api] listening on port ${env.port} (${env.nodeEnv})`);
  });
}

void startServer();
