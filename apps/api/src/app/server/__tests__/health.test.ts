import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../createApp.js';

describe('GET /api/v1/health', () => {
  it('reports application health without requiring a database', async () => {
    const app = createApp();
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toHaveProperty('configured');
  });
});
