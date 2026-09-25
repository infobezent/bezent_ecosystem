import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchNewHiresPaginated, fetchNewHires } from '../api/onboardingApi';

describe('HRMS Employee Administration Server-Side Pagination API & State', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('fetchNewHiresPaginated sends default parameters and receives pagination metadata', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: Array.from({ length: 25 }, (_, i) => ({
            id: `case_${i + 1}`,
            fullName: `Candidate ${i + 1}`,
            email: `cand${i + 1}@example.com`,
            joiningDate: '2026-10-01',
            employmentType: 'full_time',
            stage: 'preboarding',
            status: 'active',
            departmentName: 'Engineering',
            designationName: 'Software Engineer',
          })),
          pagination: {
            page: 1,
            pageSize: 25,
            totalItems: 375,
            totalPages: 15,
          },
          counts: {
            all: 375,
            preboarding: 289,
            documents: 58,
            completed: 14,
          },
        }),
      });
    });

    const res = await fetchNewHiresPaginated({ page: 1, pageSize: 25 });

    expect(capturedUrl).toContain('page=1');
    expect(capturedUrl).toContain('pageSize=25');
    expect(res.data.length).toBe(25);
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.pageSize).toBe(25);
    expect(res.pagination.totalItems).toBe(375);
    expect(res.pagination.totalPages).toBe(15);

    // Verify filter counts represent full dataset, NOT current 25 rows
    expect(res.counts.all).toBe(375);
    expect(res.counts.preboarding).toBe(289);
    expect(res.counts.documents).toBe(58);
    expect(res.counts.completed).toBe(14);
  });

  it('fetchNewHiresPaginated handles page navigation (Next page: page=2)', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [{ id: 'case_26', fullName: 'Candidate 26' }],
          pagination: {
            page: 2,
            pageSize: 25,
            totalItems: 375,
            totalPages: 15,
          },
          counts: { all: 375, preboarding: 289, documents: 58, completed: 14 },
        }),
      });
    });

    const res = await fetchNewHiresPaginated({ page: 2, pageSize: 25 });

    expect(capturedUrl).toContain('page=2');
    expect(capturedUrl).toContain('pageSize=25');
    expect(res.pagination.page).toBe(2);
  });

  it('fetchNewHiresPaginated supports page sizes 50 and 100', async () => {
    for (const size of [50, 100]) {
      let capturedUrl = '';
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        capturedUrl = url;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [],
            pagination: {
              page: 1,
              pageSize: size,
              totalItems: 375,
              totalPages: Math.ceil(375 / size),
            },
            counts: { all: 375, preboarding: 289, documents: 58, completed: 14 },
          }),
        });
      });

      const res = await fetchNewHiresPaginated({ page: 1, pageSize: size });
      expect(capturedUrl).toContain(`pageSize=${size}`);
      expect(res.pagination.pageSize).toBe(size);
      expect(res.pagination.totalPages).toBe(Math.ceil(375 / size));
    }
  });

  it('fetchNewHiresPaginated applies stage filter correctly and omits all', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, pageSize: 25, totalItems: 58, totalPages: 3 },
          counts: { all: 375, preboarding: 289, documents: 58, completed: 14 },
        }),
      });
    });

    // Filtering by stage
    await fetchNewHiresPaginated({ page: 1, pageSize: 25, stage: 'documents' });
    expect(capturedUrl).toContain('stage=documents');

    // Stage = 'all' should not append stage=all query parameter
    await fetchNewHiresPaginated({ page: 1, pageSize: 25, stage: 'all' });
    expect(capturedUrl).not.toContain('stage=all');
  });

  it('fetchNewHiresPaginated applies search parameter', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { page: 1, pageSize: 25, totalItems: 2, totalPages: 1 },
          counts: { all: 375, preboarding: 289, documents: 58, completed: 14 },
        }),
      });
    });

    await fetchNewHiresPaginated({ page: 1, pageSize: 25, search: 'Arun' });
    expect(capturedUrl).toContain('search=Arun');
  });

  it('fetchNewHiresPaginated throws on network failure and does not fall back to mock data', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(fetchNewHiresPaginated({ page: 1, pageSize: 25 })).rejects.toThrow(
      'Network error',
    );
  });

  it('fetchNewHires backward compatibility helper returns array of items', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 'case_01', fullName: 'Legacy Candidate' }],
        pagination: { page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
        counts: { all: 1, preboarding: 1, documents: 0, completed: 0 },
      }),
    });

    const items = await fetchNewHires();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);
    expect(items[0]?.fullName).toBe('Legacy Candidate');
  });
});
