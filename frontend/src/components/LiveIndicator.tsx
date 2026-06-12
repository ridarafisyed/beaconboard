'use client';

import { usePingStore } from '@/store/ping.store';

const CONFIG = {
  connected: {
    dot: 'bg-green-500',
    ping: 'bg-green-400',
    label: 'Live',
    color: 'text-green-700',
  },
  connecting: {
    dot: 'bg-yellow-400',
    ping: 'bg-yellow-300',
    label: 'Connecting…',
    color: 'text-yellow-700',
  },
  offline: {
    dot: 'bg-red-500',
    ping: null,
    label: null,
    color: 'text-red-700',
  },
} as const;

export function LiveIndicator() {
  const state = usePingStore((s) => s.connectionState);
  const reconnectIn = usePingStore((s) => s.reconnectIn);
  const cfg = CONFIG[state];

  const label =
    state === 'offline'
      ? reconnectIn > 0
        ? `Offline — retrying in ${reconnectIn}s`
        : 'Offline'
      : cfg.label;

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {cfg.ping && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.ping} opacity-75`}
          />
        )}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
      </span>
      <span className={`text-sm font-medium ${cfg.color}`}>{label}</span>
    </div>
  );
}
