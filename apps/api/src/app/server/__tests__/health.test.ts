import { describe, expect, it, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../createApp.js';
import * as connection from '../../../db/connection.js';

describe('Health Endpoints (Liveness & Readiness Semantics)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/health reports application health', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toHaveProperty('configured');
  });

  it('GET /api/v1/health/live returns 200 indicating process liveness', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/health/live');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('bezent-api');
  });

  it('GET /api/v1/health/ready returns 200 when database dependency is healthy', async () => {
    vi.spyOn(connection, 'pingDatabase').mockResolvedValue(true);
    const app = createApp();
    const response = await request(app).get('/api/v1/health/ready');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
    expect(response.body.database.connected).toBe(true);
  });

  it('GET /api/v1/health/ready returns 503 when database dependency is unavailable', async () => {
    vi.spyOn(connection, 'pingDatabase').mockResolvedValue(false);
    const app = createApp();
    const response = await request(app).get('/api/v1/health/ready');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unavailable');
    expect(response.body.database.connected).toBe(false);
  });
});
