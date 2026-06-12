/**
 * Integration tests for the monitoring API routes.
 *
 * Core component rationale:
 *  - The HTTP contract is what the frontend depends on. Breaking it breaks the UI.
 *  - The controller contains real business logic: query-param clamping (page/limit
 *    bounds), SSE header negotiation, and error propagation through asyncHandler →
 *    errorMiddleware. Unit tests on the service or repository would miss all of this.
 *  - Mocking at the service/job boundary (not at DB) keeps tests fast while still
 *    exercising the full Express middleware stack.
 *
 * Coverage:
 *  POST /api/v1/monitoring/jobs/ping  — trigger, success + error paths
 *  GET  /api/v1/monitoring/history   — pagination defaults, custom params, clamping, error
 *  GET  /api/v1/monitoring/events    — SSE headers, listener registration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- module mocks (hoisted before any import resolves) ---

vi.mock('@/config/prisma.ts', () => ({ prisma: {} }));
vi.mock('@/config/swagger.ts', () => ({ swaggerSpec: {} }));

vi.mock('@/jobs/monitoring.job.ts', () => ({
  monitoringJob: { run: vi.fn(), start: vi.fn(), stop: vi.fn() },
}));

vi.mock('@/modules/monitoring/monitoring.service.ts', () => ({
  monitoringService: { executeMonitoringCycle: vi.fn(), getHistory: vi.fn() },
}));

vi.mock('@/modules/monitoring/monitoring.events.ts', () => ({
  monitoringEvents: {
    onPingResult: vi.fn(() => vi.fn()),
    emitPingResult: vi.fn(),
  },
}));

// --- app + mocked deps (imported after mocks are in place) ---

import app from '@/app.ts';
import { monitoringJob } from '@/jobs/monitoring.job.ts';
import { monitoringService } from '@/modules/monitoring/monitoring.service.ts';
import { monitoringEvents } from '@/modules/monitoring/monitoring.events.ts';

// --- shared fixtures ---

const mockPingResult = {
  id: 'cuid-test-1',
  requestId: 'req-uuid-abcdef',
  timestamp: new Date('2026-06-11T12:00:00.000Z'),
  statusCode: 200,
  responseTimeMs: 145,
  eventType: 'health_check',
  environment: 'test',
  retry: false,
  responseBody: { json: true },
  createdAt: new Date('2026-06-11T12:00:00.000Z'),
};

const mockHistoryPage = (overrides?: object) => ({
  data: [mockPingResult],
  pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/monitoring/jobs/ping
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/monitoring/jobs/ping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with the ping result on success', async () => {
    vi.mocked(monitoringJob.run).mockResolvedValue(mockPingResult as any);

    const res = await request(app).post('/api/v1/monitoring/jobs/ping');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Monitoring job executed successfully');
    expect(res.body.data.statusCode).toBe(200);
    expect(res.body.data.eventType).toBe('health_check');
    expect(res.body.data.responseTimeMs).toBe(145);
  });

  it('returns 500 when the job throws', async () => {
    vi.mocked(monitoringJob.run).mockRejectedValue(new Error('httpbin unavailable'));

    const res = await request(app).post('/api/v1/monitoring/jobs/ping');

    expect(res.status).toBe(500);
  });

  it('calls monitoringJob.run exactly once per request', async () => {
    vi.mocked(monitoringJob.run).mockResolvedValue(mockPingResult as any);

    await request(app).post('/api/v1/monitoring/jobs/ping');

    expect(monitoringJob.run).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/monitoring/history
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/monitoring/history', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with paginated data using defaults (page=1, limit=20)', async () => {
    vi.mocked(monitoringService.getHistory).mockResolvedValue(mockHistoryPage());

    const res = await request(app).get('/api/v1/monitoring/history');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
    expect(monitoringService.getHistory).toHaveBeenCalledWith(1, 20);
  });

  it('passes custom page and limit to the service', async () => {
    vi.mocked(monitoringService.getHistory).mockResolvedValue(
      mockHistoryPage({ pagination: { total: 50, page: 3, limit: 5, totalPages: 10 } })
    );

    const res = await request(app).get('/api/v1/monitoring/history?page=3&limit=5');

    expect(res.status).toBe(200);
    expect(monitoringService.getHistory).toHaveBeenCalledWith(3, 5);
  });

  it('clamps limit to 100 when limit exceeds maximum', async () => {
    vi.mocked(monitoringService.getHistory).mockResolvedValue(mockHistoryPage());

    await request(app).get('/api/v1/monitoring/history?limit=9999');

    expect(monitoringService.getHistory).toHaveBeenCalledWith(1, 100);
  });

  it('treats limit=0 as missing and falls back to default of 20', async () => {
    // parseInt('0') is falsy, so `|| 20` kicks in — 0 is treated as "not provided"
    vi.mocked(monitoringService.getHistory).mockResolvedValue(mockHistoryPage());

    await request(app).get('/api/v1/monitoring/history?limit=0');

    expect(monitoringService.getHistory).toHaveBeenCalledWith(1, 20);
  });

  it('clamps page to 1 when page is 0', async () => {
    vi.mocked(monitoringService.getHistory).mockResolvedValue(mockHistoryPage());

    await request(app).get('/api/v1/monitoring/history?page=0');

    expect(monitoringService.getHistory).toHaveBeenCalledWith(1, 20);
  });

  it('defaults page to 1 for a non-numeric page param', async () => {
    vi.mocked(monitoringService.getHistory).mockResolvedValue(mockHistoryPage());

    await request(app).get('/api/v1/monitoring/history?page=abc');

    expect(monitoringService.getHistory).toHaveBeenCalledWith(1, 20);
  });

  it('returns the full pagination shape from the service', async () => {
    const pagination = { total: 47, page: 3, limit: 10, totalPages: 5 };
    vi.mocked(monitoringService.getHistory).mockResolvedValue(
      mockHistoryPage({ pagination })
    );

    const res = await request(app).get('/api/v1/monitoring/history?page=3&limit=10');

    expect(res.body.pagination).toEqual(pagination);
  });

  it('returns 500 when the service throws', async () => {
    vi.mocked(monitoringService.getHistory).mockRejectedValue(new Error('DB connection lost'));

    const res = await request(app).get('/api/v1/monitoring/history');

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/monitoring/events  (SSE)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/monitoring/events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds with text/event-stream content-type', (done) => {
    vi.mocked(monitoringEvents.onPingResult).mockReturnValue(vi.fn());

    const req = request(app)
      .get('/api/v1/monitoring/events')
      .on('response', (res) => {
        expect(res.headers['content-type']).toContain('text/event-stream');
        req.abort();
        done();
      });

    req.end(() => {});
  });

  it('sets Cache-Control: no-cache and Connection: keep-alive', (done) => {
    vi.mocked(monitoringEvents.onPingResult).mockReturnValue(vi.fn());

    const req = request(app)
      .get('/api/v1/monitoring/events')
      .on('response', (res) => {
        expect(res.headers['cache-control']).toBe('no-cache');
        expect(res.headers['connection']).toBe('keep-alive');
        req.abort();
        done();
      });

    req.end(() => {});
  });

  it('registers an onPingResult listener when a client connects', (done) => {
    vi.mocked(monitoringEvents.onPingResult).mockReturnValue(vi.fn());

    const req = request(app)
      .get('/api/v1/monitoring/events')
      .on('response', () => {
        expect(monitoringEvents.onPingResult).toHaveBeenCalledOnce();
        req.abort();
        done();
      });

    req.end(() => {});
  });
});
