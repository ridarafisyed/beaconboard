import type { PaginatedResponse } from './types';

const BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type AiInsight = {
  headline: string;
  status: 'healthy' | 'degraded' | 'critical';
  observations: string[];
  recommendation: string;
  recordsAnalyzed: number;
  generatedAt: string;
  successRate: number;
  avgResponseTimeMs: number;
  minResponseTimeMs: number;
  maxResponseTimeMs: number;
  recentAvgMs: number;
  olderAvgMs: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  failureCount: number;
  errorCodes: number[];
};

export const api = {
  getHistory: (page: number, limit = 20): Promise<PaginatedResponse> =>
    fetch(`${BASE}/monitoring/history?page=${page}&limit=${limit}`).then((res) =>
      handleResponse<PaginatedResponse>(res)
    ),

  triggerPing: () =>
    fetch(`${BASE}/monitoring/jobs/ping`, { method: 'POST' }).then((res) =>
      handleResponse<unknown>(res)
    ),

  getInsights: (): Promise<AiInsight> =>
    fetch(`${BASE}/ai/insights`).then((res) => handleResponse<AiInsight>(res)),

  eventsUrl: () => `${BASE}/monitoring/events`,
};
