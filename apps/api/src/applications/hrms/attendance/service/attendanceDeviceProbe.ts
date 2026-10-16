import net from 'node:net';

/**
 * Reachability check for capture devices (HR Settings -> Attendance ->
 * Capture & Devices -> Test Ping). It opens a real TCP connection to the
 * device's host and port and reports what happened. It speaks no device
 * protocol, so "online" means the terminal accepts connections, not that a
 * vendor adapter is syncing punches.
 */

export const DEFAULT_DEVICE_PORT = 4370;
const DEFAULT_TIMEOUT_MS = 2000;

export interface ProbeResult {
  reachable: boolean;
  latencyMs: number;
  error?: 'timeout' | 'refused' | 'unreachable' | 'blocked';
}

/** Cloud metadata and link-local ranges are never valid terminal addresses. */
export function isProbeableHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (!h || h === '0.0.0.0' || h.startsWith('169.254.') || h === 'metadata.google.internal') {
    return false;
  }
  return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(h) || net.isIP(h) !== 0;
}

export function probeTcp(
  host: string,
  port: number,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ProbeResult> {
  if (!isProbeableHost(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    return Promise.resolve({ reachable: false, latencyMs: 0, error: 'blocked' });
  }
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = new net.Socket();
    let settled = false;
    const finish = (result: Omit<ProbeResult, 'latencyMs'>) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, latencyMs: Math.max(1, Date.now() - startedAt) });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ reachable: true }));
    socket.once('timeout', () => finish({ reachable: false, error: 'timeout' }));
    socket.once('error', (err: NodeJS.ErrnoException) =>
      finish({ reachable: false, error: err.code === 'ECONNREFUSED' ? 'refused' : 'unreachable' }),
    );
    socket.connect(port, host);
  });
}
