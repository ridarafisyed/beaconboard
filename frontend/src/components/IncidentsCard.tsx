import type { PingResult } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

type Props = { results: PingResult[] };

export function IncidentsCard({ results }: Props) {
  const failures = results.filter((r) => r.statusCode < 200 || r.statusCode >= 300).slice(0, 5);

  if (failures.length === 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
        <p className="text-sm font-medium text-green-700">No failures detected 🎉</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-700">
        Recent Failures
      </h2>
      <ul className="space-y-2">
        {failures.map((f) => (
          <li key={f.id} className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-red-700">
              {new Date(f.createdAt).toLocaleString(undefined, {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
              {' — '}
              <span className="font-medium">{f.eventType}</span>
            </span>
            <StatusBadge statusCode={f.statusCode} />
          </li>
        ))}
      </ul>
    </div>
  );
}
