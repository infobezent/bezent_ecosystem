#!/usr/bin/env node

/**
 * BEZENT Local Development Environment Status Inspector.
 * Quickly determines the operational status of:
 * - MySQL Server 8.4 (port 3306)
 * - BEZENT Backend API (port 4000 + /api/v1/health)
 * - BEZENT Frontend Web (port 5173 / 5174)
 */

import net from 'node:net';
import http from 'node:http';

function checkPort(port, host = 'localhost', timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      status = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(port, host);
  });
}

function fetchApiHealth(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:4000/api/v1/health', { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode === 200, data: json });
        } catch {
          resolve({ ok: false, error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'Request timed out' });
    });
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('       BEZENT ECOSYSTEM — LOCAL DEV STATUS CHECK       ');
  console.log('======================================================');

  // 1. MySQL Server
  const mysqlUp = await checkPort(3306);
  if (mysqlUp) {
    console.log('  [✓] Database (MySQL :3306) : UP (Listening)');
  } else {
    console.log('  [✗] Database (MySQL :3306) : DOWN');
    console.log('      ↳ Remediation: run "npm run db:start"');
  }

  // 2. Backend API
  const apiPortUp = await checkPort(4000);
  if (apiPortUp) {
    const health = await fetchApiHealth();
    if (health.ok && health.data?.database?.connected) {
      console.log('  [✓] Backend API     (:4000) : UP (DB Connected: Yes, Health: OK)');
    } else if (health.ok) {
      console.log('  [!] Backend API     (:4000) : UP (DB Connected: NO — check database)');
    } else {
      console.log('  [!] Backend API     (:4000) : LISTENING (Health check failed)');
    }
  } else {
    console.log('  [✗] Backend API     (:4000) : DOWN');
    console.log('      ↳ Remediation: run "npm run dev:api" or inspect API console logs');
  }

  // 3. Frontend Web
  const web5173 = await checkPort(5173);
  const web5174 = await checkPort(5174);
  if (web5173) {
    console.log('  [✓] Frontend Web    (:5173) : UP (Vite dev server)');
  } else if (web5174) {
    console.log('  [✓] Frontend Web    (:5174) : UP (Vite dev server on secondary port)');
  } else {
    console.log('  [✗] Frontend Web   (:5173) : DOWN');
    console.log('      ↳ Remediation: run "npm run dev:web"');
  }

  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('[status] Error checking dev environment:', err);
});
