'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { FilterBar } from '@/components/FilterBar';
import { IncidentsCard } from '@/components/IncidentsCard';
import { LiveIndicator } from '@/components/LiveIndicator';
import { Pagination } from '@/components/Pagination';
import { PingTable } from '@/components/PingTable';
import { ResponseTimeChart } from '@/components/ResponseTimeChart';
import { StatCard } from '@/components/StatCard';
import { useLiveUpdates } from '@/hooks/useLiveUpdates';
import { usePingHistory } from '@/hooks/usePingHistory';
import { api } from '@/lib/api';
import { applyFilters } from '@/lib/filters';
import { usePingStore } from '@/store/ping.store';
import type { StatusFilter, EventFilter, DateFilter } from '@/components/FilterBar';

function Dashboard() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [triggering, setTriggering] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = usePingHistory(page);
  const liveResults = usePingStore((s) => s.liveResults);

  useLiveUpdates();

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await api.triggerPing();
      await queryClient.invalidateQueries({ queryKey: ['ping-history'] });
      setLastUpdated(new Date());
    } finally {
      setTriggering(false);
    }
  };

  const rawResults = data?.data ?? [];

  const filtered = useMemo(
    () => applyFilters(rawResults, statusFilter, eventFilter, dateFilter),
    [rawResults, statusFilter, eventFilter, dateFilter]
  );

  const total = data?.pagination.total ?? 0;
  const successCount = rawResults.filter((r) => r.statusCode >= 200 && r.statusCode < 300).length;
  const avgMs =
    rawResults.length > 0
      ? Math.round(rawResults.reduce((s, r) => s + r.responseTimeMs, 0) / rawResults.length)
      : null;
  const successRate = rawResults.length > 0 ? Math.round((successCount / rawResults.length) * 100) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Beaconboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">Real-time HTTP monitoring dashboard</p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-gray-400">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <LiveIndicator />
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="w-full min-w-[120px] rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {triggering ? '⏳ Triggering…' : 'Trigger Ping'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Pings" value={total > 0 ? total : '—'} subtitle="all time" />
        <StatCard
          title="Avg Response Time"
          value={avgMs !== null ? `${avgMs} ms` : '—'}
          subtitle="current page"
        />
        <StatCard
          title="Success Rate"
          value={successRate !== null ? `${successRate}%` : '—'}
          subtitle="2xx responses"
          accent={
            successRate === null ? 'default' : successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red'
          }
        />
      </div>

      {/* Chart */}
      {rawResults.length > 0 && (
        <div className="mb-6">
          <ResponseTimeChart results={rawResults} />
        </div>
      )}

      {/* Incidents */}
      {rawResults.length > 0 && (
        <div className="mb-6">
          <IncidentsCard results={rawResults} />
        </div>
      )}

      {/* Live results */}
      {liveResults.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Live Updates
          </h2>
          <PingTable results={liveResults} highlightFirst />
        </section>
      )}

      {/* Filters + history */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">History</h2>
          {filtered.length !== rawResults.length && (
            <span className="text-xs text-gray-400">
              Showing {filtered.length} of {rawResults.length} records
            </span>
          )}
        </div>

        <div className="mb-4">
          <FilterBar
            status={statusFilter}
            event={eventFilter}
            date={dateFilter}
            onStatus={(v) => { setStatusFilter(v); setPage(1); }}
            onEvent={(v) => { setEventFilter(v); setPage(1); }}
            onDate={(v) => { setDateFilter(v); setPage(1); }}
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load history:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <PingTable results={filtered} />
            {data && (
              <div className="mt-4">
                <Pagination
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
