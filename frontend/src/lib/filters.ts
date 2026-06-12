import type { StatusFilter, EventFilter, DateFilter } from '@/components/FilterBar';
import type { PingResult } from './types';

export function applyFilters(
  results: PingResult[],
  status: StatusFilter,
  event: EventFilter,
  date: DateFilter
): PingResult[] {
  const now = Date.now();
  const cutoffs: Record<DateFilter, number> = {
    all: 0,
    last_hour: now - 60 * 60 * 1000,
    last_24h: now - 24 * 60 * 60 * 1000,
    last_7d: now - 7 * 24 * 60 * 60 * 1000,
  };

  return results.filter((r) => {
    if (status === '2xx' && !(r.statusCode >= 200 && r.statusCode < 300)) return false;
    if (status === 'error' && r.statusCode >= 200 && r.statusCode < 300) return false;
    if (event !== 'all' && r.eventType !== event) return false;
    if (date !== 'all' && new Date(r.createdAt).getTime() < cutoffs[date]) return false;
    return true;
  });
}
