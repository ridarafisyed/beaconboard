'use client';

import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { usePingStore } from '@/store/ping.store';
import type { PingResult } from '@/lib/types';

const BASE_DELAY = 5_000;
const MAX_DELAY = 60_000;

export const useLiveUpdates = () => {
  const addResult = usePingStore((s) => s.addResult);
  const setConnectionState = usePingStore((s) => s.setConnectionState);
  const setReconnectIn = usePingStore((s) => s.setReconnectIn);
  const retryDelay = useRef(BASE_DELAY);
  const unmounted = useRef(false);

  useEffect(() => {
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;
    let countdownTimer: ReturnType<typeof setInterval>;

    const clearTimers = () => {
      clearTimeout(retryTimer);
      clearInterval(countdownTimer);
    };

    const connect = () => {
      if (unmounted.current) return;
      setConnectionState('connecting');

      es = new EventSource(api.eventsUrl());

      es.onopen = () => {
        if (unmounted.current) return;
        setConnectionState('connected');
        setReconnectIn(0);
        retryDelay.current = BASE_DELAY;
      };

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          addResult(JSON.parse(event.data) as PingResult);
        } catch {
          // malformed event — skip
        }
      };

      es.onerror = () => {
        if (unmounted.current) return;
        es.close();
        clearTimers();
        setConnectionState('offline');

        const delaySec = Math.round(retryDelay.current / 1000);
        let remaining = delaySec;
        setReconnectIn(remaining);

        countdownTimer = setInterval(() => {
          remaining -= 1;
          setReconnectIn(remaining);
          if (remaining <= 0) clearInterval(countdownTimer);
        }, 1000);

        retryTimer = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, MAX_DELAY);
          connect();
        }, retryDelay.current);
      };
    };

    connect();

    return () => {
      unmounted.current = true;
      clearTimers();
      es?.close();
      setConnectionState('offline');
    };
  }, [addResult, setConnectionState, setReconnectIn]);
};
