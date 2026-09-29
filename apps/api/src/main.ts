import { createApp } from './app/server/createApp.js';
import { assertProductionAuthConfig, env } from './app/config/env.js';

assertProductionAuthConfig();
const app = createApp();

app.listen(env.port, () => {
  console.log(`[bezent-api] listening on port ${env.port} (${env.nodeEnv})`);
});
