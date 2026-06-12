'use client';

import { create } from 'zustand';

import type { PingResult } from '@/lib/types';

export type ConnectionState = 'connecting' | 'connected' | 'offline';

const MAX_LIVE_RESULTS = 50;

type PingStore = {
  liveResults: PingResult[];
  connectionState: ConnectionState;
  reconnectIn: number;
  addResult: (result: PingResult) => void;
  setConnectionState: (state: ConnectionState) => void;
  setReconnectIn: (seconds: number) => void;
};

export const usePingStore = create<PingStore>((set) => ({
  liveResults: [],
  connectionState: 'connecting',
  reconnectIn: 0,
  addResult: (result) =>
    set((state) => ({
      liveResults: [result, ...state.liveResults].slice(0, MAX_LIVE_RESULTS),
    })),
  setConnectionState: (connectionState) => set({ connectionState }),
  setReconnectIn: (reconnectIn) => set({ reconnectIn }),
}));
