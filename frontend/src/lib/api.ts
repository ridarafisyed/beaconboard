import type { PaginatedResponse } from './types';

const BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export const api = {
  getHistory: (page: number, limit = 20): Promise<PaginatedResponse> =>
    fetch(`${BASE}/monitoring/history?page=${page}&limit=${limit}`).then((res) =>
      handleResponse<PaginatedResponse>(res)
    ),

  triggerPing: () =>
    fetch(`${BASE}/monitoring/jobs/ping`, { method: 'POST' }).then((res) =>
      handleResponse<unknown>(res)
    ),

  eventsUrl: () => `${BASE}/monitoring/events`,
};
