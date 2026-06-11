import { randomUUID } from 'crypto';

import { env } from '@/config/env.ts'

import type { MonitoringPayload } from './monitoring.types.ts';

const eventTypes = ['health_check', 'status_probe', 'latency_test'];

export const generateMonitoringPayload = (): MonitoringPayload => {
  const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)] ?? 'health_check';

  return {
    requestId: randomUUID(),
    timestamp: new Date().toISOString(),
    source: 'pulsewatch-monitor',
    eventType: randomEvent,
    metadata: {
      environment: env.nodeEnv,
      retry: false,
    },
  };
};