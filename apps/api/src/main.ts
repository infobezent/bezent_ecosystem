import { createApp } from './app/server/createApp.js';
import { env } from './app/config/env.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`[bezent-api] listening on port ${env.port} (${env.nodeEnv})`);
});
