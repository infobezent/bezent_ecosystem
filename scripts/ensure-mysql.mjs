#!/usr/bin/env node
/* eslint-disable */
import net from 'node:net';
import { execSync } from 'node:child_process';
import process from 'node:process';

function checkPort(port = 3306, host = '127.0.0.1', timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
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

async function main() {
  const isUp = await checkPort(3306);
  if (isUp) {
    console.log('[db] MySQL Server is running on port 3306.');
    process.exit(0);
  }

  console.log('[db] MySQL is not reachable on port 3306. Attempting to start...');

  if (process.platform === 'darwin') {
    try {
      execSync('brew services start mysql', { stdio: 'inherit' });
    } catch {
      try {
        execSync('mysql.server start', { stdio: 'inherit' });
      } catch (err) {
        console.warn(
          '[db] Note: Could not auto-start MySQL with brew or mysql.server:',
          err.message,
        );
      }
    }
  } else if (process.platform === 'win32') {
    try {
      execSync('powershell -ExecutionPolicy Bypass -File ./scripts/start-mysql.ps1', {
        stdio: 'inherit',
      });
    } catch (err) {
      console.warn('[db] Note: Could not auto-start MySQL via powershell:', err.message);
    }
  }

  // Check again
  const upAfter = await checkPort(3306);
  if (upAfter) {
    console.log('[db] MySQL Server is now running on port 3306.');
    process.exit(0);
  } else {
    console.log('[db] Warning: MySQL is not listening on port 3306.');
    process.exit(0);
  }
}

main().catch(() => process.exit(0));
