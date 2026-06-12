import { describe, it, expect } from 'vitest';

import { generateMonitoringPayload } from '@/modules/monitoring/payload-generator.ts';

const VALID_EVENT_TYPES = ['health_check', 'status_probe', 'latency_test'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('generateMonitoringPayload', () => {
  it('returns a payload with all required fields', () => {
    const payload = generateMonitoringPayload();
    expect(payload).toHaveProperty('requestId');
    expect(payload).toHaveProperty('timestamp');
    expect(payload).toHaveProperty('source');
    expect(payload).toHaveProperty('eventType');
    expect(payload.metadata).toHaveProperty('environment');
    expect(payload.metadata).toHaveProperty('retry');
  });

  it('generates a valid UUID for requestId', () => {
    expect(generateMonitoringPayload().requestId).toMatch(UUID_REGEX);
  });

  it('generates unique requestIds across calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateMonitoringPayload().requestId));
    expect(ids.size).toBe(20);
  });

  it('generates a valid ISO timestamp', () => {
    const { timestamp } = generateMonitoringPayload();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });

  it('timestamp is close to the current time', () => {
    const before = Date.now();
    const { timestamp } = generateMonitoringPayload();
    const after = Date.now();
    const ts = new Date(timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('sets source to "pulsewatch-monitor"', () => {
    expect(generateMonitoringPayload().source).toBe('pulsewatch-monitor');
  });

  it('sets retry to false', () => {
    expect(generateMonitoringPayload().metadata.retry).toBe(false);
  });

  it('only generates valid event types', () => {
    const types = new Set(Array.from({ length: 100 }, () => generateMonitoringPayload().eventType));
    for (const t of types) {
      expect(VALID_EVENT_TYPES).toContain(t);
    }
  });

  it('eventually generates all three event types given enough calls', () => {
    const types = new Set(Array.from({ length: 200 }, () => generateMonitoringPayload().eventType));
    expect(types.size).toBe(3);
  });
});
