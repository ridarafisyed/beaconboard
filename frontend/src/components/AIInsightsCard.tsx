'use client';

import { useState } from 'react';

import { api } from '@/lib/api';
import type { AiInsight } from '@/lib/api';

const STATUS_CONFIG = {
  healthy: {
    badge: 'bg-green-100 text-green-800 ring-green-200',
    border: 'border-green-200',
    label: 'Healthy',
  },
  degraded: {
    badge: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
    border: 'border-yellow-200',
    label: 'Degraded',
  },
  critical: {
    badge: 'bg-red-100 text-red-800 ring-red-200',
    border: 'border-red-200',
    label: 'Critical',
  },
} as const;

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

  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm ${cfg?.border ?? 'border-gray-200'}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            AI Insights
          </h2>
          {insight && (
            <p className="mt-0.5 text-xs text-gray-400">
              {insight.recordsAnalyzed} records · {new Date(insight.generatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Analysing…' : insight ? 'Regenerate' : 'Generate Insights'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!insight && !error && !loading && (
        <p className="text-sm text-gray-400">
          Click <span className="font-medium text-gray-600">Generate Insights</span> to get an
          AI-powered summary of your monitoring data.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
          Analysing {' '}recent ping data…
        </div>
      )}

      {insight && cfg && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            <p className="text-sm font-medium text-gray-800">{insight.headline}</p>
          </div>

          {insight.observations.length > 0 && (
            <ul className="space-y-1.5 border-t border-gray-100 pt-3">
              {insight.observations.map((obs, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-0.5 shrink-0 text-gray-300">→</span>
                  {obs}
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
            <span className="mr-1 font-medium text-gray-900">Recommendation:</span>
            {insight.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}
