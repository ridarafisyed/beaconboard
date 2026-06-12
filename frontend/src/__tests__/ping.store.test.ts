import { describe, it, expect, beforeEach } from 'vitest';

import { usePingStore } from '@/store/ping.store';
import type { PingResult } from '@/lib/types';

function makeResult(id: string, overrides: Partial<PingResult> = {}): PingResult {
  return {
    id,
    requestId: `req-${id}`,
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

beforeEach(() => {
  usePingStore.setState({ liveResults: [], connectionState: 'connecting', reconnectIn: 0 });
});

describe('ping.store', () => {
  describe('initial state', () => {
    it('starts with an empty liveResults array', () => {
      expect(usePingStore.getState().liveResults).toEqual([]);
    });

    it('starts with connectionState "connecting"', () => {
      expect(usePingStore.getState().connectionState).toBe('connecting');
    });

    it('starts with reconnectIn 0', () => {
      expect(usePingStore.getState().reconnectIn).toBe(0);
    });
  });

  describe('addResult', () => {
    it('adds a result to the store', () => {
      usePingStore.getState().addResult(makeResult('a'));
      expect(usePingStore.getState().liveResults).toHaveLength(1);
    });

    it('prepends results so the newest is first', () => {
      usePingStore.getState().addResult(makeResult('first'));
      usePingStore.getState().addResult(makeResult('second'));
      const { liveResults } = usePingStore.getState();
      expect(liveResults[0]!.id).toBe('second');
      expect(liveResults[1]!.id).toBe('first');
    });

    it('preserves existing results when adding new ones', () => {
      usePingStore.getState().addResult(makeResult('a'));
      usePingStore.getState().addResult(makeResult('b'));
      expect(usePingStore.getState().liveResults).toHaveLength(2);
    });

    it('caps live results at 50', () => {
      for (let i = 0; i < 55; i++) {
        usePingStore.getState().addResult(makeResult(String(i)));
      }
      expect(usePingStore.getState().liveResults).toHaveLength(50);
    });

    it('keeps the 50 most recent results when cap is reached', () => {
      for (let i = 0; i < 55; i++) {
        usePingStore.getState().addResult(makeResult(String(i)));
      }
      const { liveResults } = usePingStore.getState();
      // Most recent is id='54' (added last, prepended to front)
      expect(liveResults[0]!.id).toBe('54');
      // Oldest kept is id='5' (54, 53, ..., 5 = 50 entries)
      expect(liveResults[49]!.id).toBe('5');
    });

    it('does not exceed 50 with repeated additions', () => {
      for (let i = 0; i < 200; i++) {
        usePingStore.getState().addResult(makeResult(String(i)));
      }
      expect(usePingStore.getState().liveResults.length).toBeLessThanOrEqual(50);
    });
  });

  describe('setConnectionState', () => {
    it('updates connectionState to "connected"', () => {
      usePingStore.getState().setConnectionState('connected');
      expect(usePingStore.getState().connectionState).toBe('connected');
    });

    it('updates connectionState to "offline"', () => {
      usePingStore.getState().setConnectionState('offline');
      expect(usePingStore.getState().connectionState).toBe('offline');
    });

    it('can transition back from offline to connected', () => {
      usePingStore.getState().setConnectionState('offline');
      usePingStore.getState().setConnectionState('connected');
      expect(usePingStore.getState().connectionState).toBe('connected');
    });
  });

  describe('setReconnectIn', () => {
    it('sets the countdown value', () => {
      usePingStore.getState().setReconnectIn(30);
      expect(usePingStore.getState().reconnectIn).toBe(30);
    });

    it('can be set to 0 to clear the countdown', () => {
      usePingStore.getState().setReconnectIn(10);
      usePingStore.getState().setReconnectIn(0);
      expect(usePingStore.getState().reconnectIn).toBe(0);
    });

    it('updates independently of connectionState', () => {
      usePingStore.getState().setConnectionState('offline');
      usePingStore.getState().setReconnectIn(20);
      expect(usePingStore.getState().connectionState).toBe('offline');
      expect(usePingStore.getState().reconnectIn).toBe(20);
    });
  });
});
