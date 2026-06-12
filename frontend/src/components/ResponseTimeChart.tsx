'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PingResult } from '@/lib/types';

type Props = { results: PingResult[] };

type ChartPoint = { time: string; ms: number; status: number };

export function ResponseTimeChart({ results }: Props) {
  if (results.length === 0) return null;

  const data: ChartPoint[] = [...results].reverse().map((r) => ({
    time: new Date(r.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    ms: r.responseTimeMs,
    status: r.statusCode,
  }));

  const avg = Math.round(data.reduce((s, d) => s + d.ms, 0) / data.length);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Response Time
        </h2>
        <span className="text-xs text-gray-400">avg {avg} ms</span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            interval="preserveStartEnd"
            tickCount={5}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            unit="ms"
            width={56}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
            formatter={(v: number) => [`${v} ms`, 'Response Time']}
          />
          <ReferenceLine y={avg} stroke="#d1d5db" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="ms"
            stroke="#2563eb"
            strokeWidth={2}
            dot={({ cx, cy, payload }: { cx: number; cy: number; payload: ChartPoint }) => (
              <circle
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={4}
                fill={payload.status >= 200 && payload.status < 300 ? '#16a34a' : '#dc2626'}
                stroke="white"
                strokeWidth={2}
              />
            )}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-2 text-center text-[10px] text-gray-400">
        Green dots = success · Red dots = error
      </p>
    </div>
  );
}
