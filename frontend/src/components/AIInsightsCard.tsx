'use client';

import { useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import { api } from '@/lib/api';
import type { AiInsight } from '@/lib/api';

type Status = AiInsight['status'];

const STATUS_CONFIG: Record<Status, {
  badge: string; border: string; divider: string;
  dot: string; ping: string; obsDot: string;
  recBg: string; ringColor: string; ringTrack: string;
  barColor: string; label: string; showPing: boolean;
}> = {
  healthy: {
    badge: 'bg-green-100 text-green-700 ring-green-200',
    border: 'border-green-200',
    divider: 'border-green-100',
    dot: 'bg-green-500',
    ping: 'bg-green-400',
    obsDot: 'bg-green-400',
    recBg: 'bg-green-50 border-green-100',
    ringColor: '#16a34a',
    ringTrack: '#dcfce7',
    barColor: '#16a34a',
    label: 'Healthy',
    showPing: true,
  },
  degraded: {
    badge: 'bg-amber-100 text-amber-700 ring-amber-200',
    border: 'border-amber-200',
    divider: 'border-amber-100',
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
    obsDot: 'bg-amber-400',
    recBg: 'bg-amber-50 border-amber-100',
    ringColor: '#d97706',
    ringTrack: '#fef3c7',
    barColor: '#d97706',
    label: 'Degraded',
    showPing: true,
  },
  critical: {
    badge: 'bg-red-100 text-red-700 ring-red-200',
    border: 'border-red-200',
    divider: 'border-red-100',
    dot: 'bg-red-500',
    ping: 'bg-red-400',
    obsDot: 'bg-red-400',
    recBg: 'bg-red-50 border-red-100',
    ringColor: '#dc2626',
    ringTrack: '#fee2e2',
    barColor: '#dc2626',
    label: 'Critical',
    showPing: false,
  },
};

function SuccessRing({ rate, status }: { rate: number; status: Status }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - rate / 100);
  const { ringColor: c, ringTrack: t } = STATUS_CONFIG[status];
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke={t} strokeWidth="7" />
      <circle
        cx="40" cy="40" r={r}
        fill="none" stroke={c} strokeWidth="7"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="38" textAnchor="middle" fontSize="15" fontWeight="700" fill={c}>
        {rate}%
      </text>
      <text x="40" y="52" textAnchor="middle" fontSize="9" fill="#9ca3af">
        success
      </text>
    </svg>
  );
}

const tooltipContentStyle = {
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: 11,
  padding: '4px 8px',
};
const tooltipLabelStyle = { color: '#6b7280', fontSize: 10 };

export function AIInsightsCard() {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInsights();
      setInsight(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  const cfg = insight ? STATUS_CONFIG[insight.status] : null;

  const trendLabel =
    insight?.trend === 'increasing' ? '↑ slower'
    : insight?.trend === 'decreasing' ? '↓ faster'
    : '→ stable';

  const trendBarColor =
    insight?.trend === 'increasing' ? '#dc2626'
    : insight?.trend === 'decreasing' ? '#16a34a'
    : '#6b7280';

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-sm ${cfg?.border ?? 'border-gray-200'}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1l1.4 4.2L14 7l-4.6 1.8L8 14l-1.4-5.2L2 7l4.6-1.8z" />
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700">AI Insights</h2>
              {insight?.fromCache && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                  cached
                </span>
              )}
            </div>
            {insight && (
              <p className="text-xs text-gray-400">
                {insight.recordsAnalyzed} records · {new Date(insight.generatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Analysing…' : insight ? 'Regenerate' : 'Generate Insights'}
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!insight && !error && !loading && (
          <p className="text-sm text-gray-400">
            Click <span className="font-medium text-gray-600">Generate Insights</span> to get an
            AI-powered summary of your monitoring data.
          </p>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
              Analysing recent ping data…
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-2.5 w-3/4 animate-pulse rounded-full bg-gray-100" />
              <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-gray-100" />
              <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
        )}

        {insight && cfg && (
          <div className="space-y-4">
            {/* Status + Headline */}
            <div className="flex items-start gap-3">
              <div className="relative mt-1 shrink-0">
                {cfg.showPing && (
                  <span className={`absolute inline-flex h-3 w-3 animate-ping rounded-full opacity-60 ${cfg.ping}`} />
                )}
                <span className={`relative inline-flex h-3 w-3 rounded-full ${cfg.dot}`} />
              </div>
              <div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <p className="mt-1.5 text-sm font-medium leading-snug text-gray-800">
                  {insight.headline}
                </p>
              </div>
            </div>

            {/* Mini charts */}
            <div className={`grid grid-cols-3 gap-4 border-t pt-4 ${cfg.divider}`}>
              {/* Success rate donut */}
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Success Rate
                </p>
                <SuccessRing rate={insight.successRate} status={insight.status} />
              </div>

              {/* Response time: min / avg / max */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Response Time
                </p>
                <ResponsiveContainer width="100%" height={88}>
                  <BarChart
                    data={[
                      { name: 'Min', ms: insight.minResponseTimeMs },
                      { name: 'Avg', ms: insight.avgResponseTimeMs },
                      { name: 'Max', ms: insight.maxResponseTimeMs },
                    ]}
                    margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                    barCategoryGap="22%"
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      formatter={(v: number | string | ReadonlyArray<number | string> | undefined) => [`${v ?? 0}ms`]}
                    />
                    <Bar dataKey="ms" radius={[3, 3, 0, 0]}>
                      <Cell fill="#d1d5db" />
                      <Cell fill={cfg.barColor} />
                      <Cell fill="#9ca3af" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Trend: older vs recent */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Trend{' '}
                  <span className="normal-case font-normal text-gray-400">
                    ({trendLabel})
                  </span>
                </p>
                <ResponsiveContainer width="100%" height={88}>
                  <BarChart
                    data={[
                      { name: 'Older', ms: insight.olderAvgMs },
                      { name: 'Recent', ms: insight.recentAvgMs },
                    ]}
                    margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                    barCategoryGap="22%"
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      formatter={(v: number | string | ReadonlyArray<number | string> | undefined) => [`${v ?? 0}ms`]}
                    />
                    <Bar dataKey="ms" radius={[3, 3, 0, 0]}>
                      <Cell fill="#d1d5db" />
                      <Cell fill={trendBarColor} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Observations */}
            {insight.observations.length > 0 && (
              <div className={`border-t pt-4 ${cfg.divider}`}>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Observations
                </p>
                <ul className="space-y-2.5">
                  {insight.observations.map((obs, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.obsDot}`} />
                      {obs}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendation */}
            <div className={`rounded-lg border px-3.5 py-3 ${cfg.recBg}`}>
              <div className="flex items-start gap-2.5">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 1a4.5 4.5 0 0 1 2 8.527V11H6V9.527A4.5 4.5 0 0 1 8 1z" />
                  <path d="M6 12h4M6.5 14h3" />
                </svg>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Recommendation
                  </p>
                  <p className="mt-0.5 text-sm text-gray-700">{insight.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Token usage + rate limit footer */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-400">
              <span>
                {insight.tokenUsage.inputTokens.toLocaleString()} tokens · est.{' '}
                <span className="font-medium text-gray-500">
                  ${insight.tokenUsage.estimatedCostUsd.toFixed(6)}
                </span>
              </span>
              <span>
                {insight.rateLimit.remaining}/{insight.rateLimit.limit} requests remaining this hour
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
