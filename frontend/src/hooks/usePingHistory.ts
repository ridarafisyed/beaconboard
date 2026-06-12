'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const usePingHistory = (page: number, limit = 20) =>
  useQuery({
    queryKey: ['ping-history', page, limit],
    queryFn: () => api.getHistory(page, limit),
    staleTime: 30_000,
  });
