import { describe, it, expect } from 'vitest';

import { applyFilters } from '@/lib/filters';
import type { PingResult } from '@/lib/types';

function makeResult(overrides: Partial<PingResult> = {}): PingResult {
  return {
    id: Math.random().toString(36).slice(2),
    requestId: 'req-id',
    statusCode: 200,
    responseTimeMs: 100,
    eventType: 'health_check',
    environment: 'test',
    retry: false,
    responseBody: {},
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

const now = Date.now();
const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString();
const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();

describe('applyFilters', () => {
  describe('empty input', () => {
    it('returns an empty array when results is empty', () => {
      expect(applyFilters([], 'all', 'all', 'all')).toHaveLength(0);
    });
  });

  describe('status filter', () => {
    const mixed = [
      makeResult({ statusCode: 200 }),
      makeResult({ statusCode: 201 }),
      makeResult({ statusCode: 301 }),
      makeResult({ statusCode: 404 }),
      makeResult({ statusCode: 500 }),
    ];

    it('"all" returns every result regardless of status', () => {
      expect(applyFilters(mixed, 'all', 'all', 'all')).toHaveLength(5);
    });

    it('"2xx" returns only 2xx responses', () => {
      const filtered = applyFilters(mixed, '2xx', 'all', 'all');
      expect(filtered).toHaveLength(2);
      expect(filtered.every((r) => r.statusCode >= 200 && r.statusCode < 300)).toBe(true);
    });

    it('"error" excludes all 2xx responses', () => {
      const filtered = applyFilters(mixed, 'error', 'all', 'all');
      expect(filtered).toHaveLength(3);
      expect(filtered.every((r) => r.statusCode < 200 || r.statusCode >= 300)).toBe(true);
    });

    it('"2xx" boundary: 199 excluded, 200 included, 299 included, 300 excluded', () => {
      const results = [
        makeResult({ statusCode: 199 }),
        makeResult({ statusCode: 200 }),
        makeResult({ statusCode: 299 }),
        makeResult({ statusCode: 300 }),
      ];
      const filtered = applyFilters(results, '2xx', 'all', 'all');
      expect(filtered.map((r) => r.statusCode)).toEqual([200, 299]);
    });

    it('"error" boundary: 199 included, 200 excluded, 299 excluded, 300 included', () => {
      const results = [
        makeResult({ statusCode: 199 }),
        makeResult({ statusCode: 200 }),
        makeResult({ statusCode: 299 }),
        makeResult({ statusCode: 300 }),
      ];
      const filtered = applyFilters(results, 'error', 'all', 'all');
      expect(filtered.map((r) => r.statusCode)).toEqual([199, 300]);
    });
  });

  describe('event filter', () => {
    const mixed = [
      makeResult({ eventType: 'health_check' }),
      makeResult({ eventType: 'status_probe' }),
      makeResult({ eventType: 'latency_test' }),
    ];

    it('"all" returns every event type', () => {
      expect(applyFilters(mixed, 'all', 'all', 'all')).toHaveLength(3);
    });

    it('filters to health_check only', () => {
      expect(applyFilters(mixed, 'all', 'health_check', 'all')).toHaveLength(1);
    });

    it('filters to status_probe only', () => {
      expect(applyFilters(mixed, 'all', 'status_probe', 'all')).toHaveLength(1);
    });

    it('filters to latency_test only', () => {
      expect(applyFilters(mixed, 'all', 'latency_test', 'all')).toHaveLength(1);
    });
  });

  describe('date filter', () => {
    const results = [
      makeResult({ createdAt: tenMinutesAgo }),  // within last_hour, last_24h, last_7d
      makeResult({ createdAt: twoHoursAgo }),    // within last_24h, last_7d
      makeResult({ createdAt: twoDaysAgo }),     // within last_7d only
      makeResult({ createdAt: tenDaysAgo }),     // outside all windows
    ];

    it('"all" returns everything regardless of date', () => {
      expect(applyFilters(results, 'all', 'all', 'all')).toHaveLength(4);
    });

    it('"last_hour" includes only results from the past hour', () => {
      expect(applyFilters(results, 'all', 'all', 'last_hour')).toHaveLength(1);
    });

    it('"last_24h" includes results from the past 24 hours', () => {
      expect(applyFilters(results, 'all', 'all', 'last_24h')).toHaveLength(2);
    });

    it('"last_7d" includes results from the past 7 days', () => {
      expect(applyFilters(results, 'all', 'all', 'last_7d')).toHaveLength(3);
    });
  });

  describe('combined filters (AND logic)', () => {
    it('applies status AND event filters together', () => {
      const results = [
        makeResult({ statusCode: 200, eventType: 'health_check' }),
        makeResult({ statusCode: 200, eventType: 'latency_test' }),
        makeResult({ statusCode: 500, eventType: 'health_check' }),
      ];
      expect(applyFilters(results, '2xx', 'health_check', 'all')).toHaveLength(1);
    });

    it('applies status AND date filters together', () => {
      const results = [
        makeResult({ statusCode: 200, createdAt: tenMinutesAgo }),
        makeResult({ statusCode: 500, createdAt: tenMinutesAgo }),
        makeResult({ statusCode: 200, createdAt: tenDaysAgo }),
      ];
      expect(applyFilters(results, '2xx', 'all', 'last_hour')).toHaveLength(1);
    });

    it('returns empty array when no results match combined filters', () => {
      const results = [makeResult({ statusCode: 200, eventType: 'latency_test' })];
      expect(applyFilters(results, 'error', 'health_check', 'all')).toHaveLength(0);
    });
  });
});
