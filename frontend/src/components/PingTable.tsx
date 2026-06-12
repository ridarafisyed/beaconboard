'use client';

import { Fragment, useState } from 'react';

import type { PingResult } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

type Props = {
  results: PingResult[];
  highlightFirst?: boolean;
};

function Trend({ current, prev }: { current: number; prev?: number }) {
  if (prev === undefined) return <span className="text-gray-300">—</span>;
  if (current < prev) return <span className="font-semibold text-green-600">↓</span>;
  if (current > prev) return <span className="font-semibold text-red-500">↑</span>;
  return <span className="text-gray-400">→</span>;
}

function DetailPanel({ result }: { result: PingResult }) {
  return (
    <tr>
      <td colSpan={7} className="bg-gray-50 px-6 py-4">
        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wider text-gray-500">
              Request Payload
            </p>
            <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-3 text-gray-700">
              {JSON.stringify(
                {
                  requestId: result.requestId,
                  eventType: result.eventType,
                  environment: result.environment,
                  retry: result.retry,
                },
                null,
                2
              )}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-semibold uppercase tracking-wider text-gray-500">
              Response Body
            </p>
            <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-3 text-gray-700">
              {JSON.stringify(result.responseBody, null, 2)}
            </pre>
          </div>
        </div>
      </td>
    </tr>
  );
}

const COLUMNS = [
  { label: '', className: '' },
  { label: 'Time', className: '' },
  { label: 'Request ID', className: 'hidden sm:table-cell' },
  { label: 'Event Type', className: '' },
  { label: 'Status', className: '' },
  { label: 'Duration', className: '' },
  { label: 'Trend', className: '' },
];

export function PingTable({ results, highlightFirst = false }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 ${col.className}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {results.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center">
                <p className="font-medium text-gray-400">No monitoring records yet.</p>
                <p className="mt-1 text-xs text-gray-400">
                  Trigger your first ping to start monitoring.
                </p>
              </td>
            </tr>
          ) : (
            results.map((r, i) => {
              const isExpanded = expandedId === r.id;
              const prev = results[i + 1];

              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => toggle(r.id)}
                    className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                      highlightFirst && i === 0 ? 'bg-blue-50' : ''
                    } ${isExpanded ? 'bg-blue-50' : ''}`}
                  >
                    <td className="w-6 px-4 py-3 text-gray-400">
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {new Date(r.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-gray-400 sm:table-cell">
                      {r.requestId.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.eventType}</td>
                    <td className="px-4 py-3">
                      <StatusBadge statusCode={r.statusCode} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.responseTimeMs} ms</td>
                    <td className="px-4 py-3">
                      <Trend current={r.responseTimeMs} prev={prev?.responseTimeMs} />
                    </td>
                  </tr>
                  {isExpanded && <DetailPanel result={r} />}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
