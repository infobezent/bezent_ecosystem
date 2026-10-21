import { createApp } from './app/server/createApp.js';
import { assertProductionAuthConfig, env } from './app/config/env.js';
import { closePool, ensureDatabaseConnected, isDatabaseConfigured } from './db/connection.js';
import { backgroundWorkerRunner } from './platform/workers/backgroundWorker.runner.js';
import { attendanceAutoLockService } from './applications/hrms/attendance/service/attendanceAutoLock.service.js';
import { attendanceCompOffExpiryService } from './applications/hrms/attendance/service/attendanceCompOffExpiry.service.js';
import { attendanceMissingPunchDetectorService } from './applications/hrms/attendance/service/attendanceMissingPunchDetector.service.js';
import { syncAllUnlinkedEmployees } from './applications/hrms/employees/service/employeeUserBridge.service.js';

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
    backgroundWorkerRunner.start();
    console.log('[workers] Background worker runner started');
    attendanceAutoLockService.start();
    console.log('[workers] Attendance auto-lock sweep started');
    attendanceCompOffExpiryService.start();
    console.log('[workers] Attendance comp-off expiry auto-lapse daemon started');
    attendanceMissingPunchDetectorService.start();
    console.log('[workers] Attendance missing punch detector sweeper started');
    try {
      const syncedCount = await syncAllUnlinkedEmployees();
      if (syncedCount > 0) {
        console.log(
          `[auth] Provisioned ${syncedCount} unlinked employee user accounts for ESS access`,
        );
      }
    } catch (err) {
      console.warn('[auth] Employee user sync on startup skipped/failed:', err);
    }
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`[bezent-api] listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[bezent-api] received ${signal}, shutting down gracefully...`);
    backgroundWorkerRunner.stop();
    attendanceAutoLockService.stop();
    attendanceCompOffExpiryService.stop();
    attendanceMissingPunchDetectorService.stop();
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
