import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AIInsightsCard } from '@/components/AIInsightsCard';
import type { AiInsight } from '@/lib/api';

// ── Recharts renders SVGs that don't work in jsdom — stub them out ────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  Cell: () => null,
  XAxis: () => null,
  Tooltip: () => null,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { ...actual.api, getInsights: vi.fn() } };
});

import { api } from '@/lib/api';
const mockGetInsights = vi.mocked(api.getInsights);

function makeInsight(overrides: Partial<AiInsight> = {}): AiInsight {
  return {
    headline: 'Service is operating normally.',
    status: 'healthy',
    observations: ['Success rate is 98%.', 'Avg response time is 120ms.'],
    recommendation: 'No action needed.',
    recordsAnalyzed: 50,
    generatedAt: new Date('2025-01-01T12:00:00Z').toISOString(),
    fromCache: false,
    successRate: 98,
    avgResponseTimeMs: 120,
    minResponseTimeMs: 80,
    maxResponseTimeMs: 400,
    recentAvgMs: 110,
    olderAvgMs: 130,
    trend: 'stable',
    failureCount: 1,
    errorCodes: [503],
    tokenUsage: { inputTokens: 1200, outputTokens: 180, estimatedCostUsd: 0.000144 },
    rateLimit: { used: 3, remaining: 17, limit: 20, resetAt: null },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AIInsightsCard', () => {
  describe('empty state', () => {
    it('shows a prompt to generate insights before any data is loaded', () => {
      render(<AIInsightsCard />);
      // The paragraph has mixed content (text + span) so match against the unique trailing text
      expect(screen.getByText(/AI-powered summary of your monitoring data/i)).toBeInTheDocument();
    });

    it('renders the "Generate Insights" button', () => {
      render(<AIInsightsCard />);
      expect(screen.getByRole('button', { name: /generate insights/i })).toBeInTheDocument();
    });

    it('does not show status badge or headline before generation', () => {
      render(<AIInsightsCard />);
      expect(screen.queryByText('Healthy')).not.toBeInTheDocument();
      expect(screen.queryByText('Degraded')).not.toBeInTheDocument();
      expect(screen.queryByText('Critical')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows "Analysing…" while the request is in flight', async () => {
      mockGetInsights.mockReturnValue(new Promise(() => {})); // never resolves
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button', { name: /generate insights/i }));
      expect(await screen.findByText(/analysing recent ping data/i)).toBeInTheDocument();
    });

    it('disables the button while loading', async () => {
      mockGetInsights.mockReturnValue(new Promise(() => {}));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('shows the error message when the API call fails', async () => {
      mockGetInsights.mockRejectedValue(new Error('Rate limit exceeded'));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button', { name: /generate insights/i }));
      expect(await screen.findByText(/rate limit exceeded/i)).toBeInTheDocument();
    });

    it('re-enables the button after an error', async () => {
      mockGetInsights.mockRejectedValue(new Error('Something went wrong'));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button', { name: /generate insights/i }));
      await screen.findByText(/something went wrong/i);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('shows a generic fallback message for non-Error rejections', async () => {
      mockGetInsights.mockRejectedValue('network failure');
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button', { name: /generate insights/i }));
      expect(await screen.findByText(/failed to generate insights/i)).toBeInTheDocument();
    });
  });

  describe('healthy status', () => {
    it('shows the Healthy badge', async () => {
      mockGetInsights.mockResolvedValue(makeInsight({ status: 'healthy' }));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      expect(await screen.findByText('Healthy')).toBeInTheDocument();
    });

    it('shows the headline', async () => {
      mockGetInsights.mockResolvedValue(makeInsight());
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      expect(await screen.findByText('Service is operating normally.')).toBeInTheDocument();
    });
  });

  describe('degraded status', () => {
    it('shows the Degraded badge', async () => {
      mockGetInsights.mockResolvedValue(makeInsight({ status: 'degraded', successRate: 80 }));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      expect(await screen.findByText('Degraded')).toBeInTheDocument();
    });
  });

  describe('critical status', () => {
    it('shows the Critical badge', async () => {
      mockGetInsights.mockResolvedValue(makeInsight({ status: 'critical', successRate: 50 }));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      expect(await screen.findByText('Critical')).toBeInTheDocument();
    });
  });

  describe('insight content', () => {
    it('renders all observations', async () => {
      mockGetInsights.mockResolvedValue(makeInsight());
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      await screen.findByText('Healthy');
      expect(screen.getByText('Success rate is 98%.')).toBeInTheDocument();
      expect(screen.getByText('Avg response time is 120ms.')).toBeInTheDocument();
    });

    it('renders the recommendation', async () => {
      mockGetInsights.mockResolvedValue(makeInsight());
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      expect(await screen.findByText('No action needed.')).toBeInTheDocument();
    });

    it('shows the records analysed count and generation time', async () => {
      mockGetInsights.mockResolvedValue(makeInsight({ recordsAnalyzed: 50 }));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      await screen.findByText('Healthy');
      expect(screen.getByText(/50 records/)).toBeInTheDocument();
    });

    it('shows token usage and estimated cost', async () => {
      mockGetInsights.mockResolvedValue(makeInsight());
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      await screen.findByText('Healthy');
      expect(screen.getByText(/1,200 tokens/)).toBeInTheDocument();
      expect(screen.getByText(/\$0\.000144/)).toBeInTheDocument();
    });

    it('shows rate limit remaining', async () => {
      mockGetInsights.mockResolvedValue(makeInsight());
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      await screen.findByText('Healthy');
      expect(screen.getByText(/17\/20 requests remaining/i)).toBeInTheDocument();
    });
  });

  describe('cache indicator', () => {
    it('shows a "cached" badge when the response is served from cache', async () => {
      mockGetInsights.mockResolvedValue(makeInsight({ fromCache: true }));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      await screen.findByText('Healthy');
      expect(screen.getByText('cached')).toBeInTheDocument();
    });

    it('does not show the "cached" badge for a fresh response', async () => {
      mockGetInsights.mockResolvedValue(makeInsight({ fromCache: false }));
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button'));
      await screen.findByText('Healthy');
      expect(screen.queryByText('cached')).not.toBeInTheDocument();
    });
  });

  describe('regenerate', () => {
    it('shows "Regenerate" button after a successful load', async () => {
      mockGetInsights.mockResolvedValue(makeInsight());
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button', { name: /generate insights/i }));
      await screen.findByText('Healthy');
      expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
    });

    it('calls the API again when Regenerate is clicked', async () => {
      mockGetInsights.mockResolvedValue(makeInsight());
      render(<AIInsightsCard />);
      fireEvent.click(screen.getByRole('button', { name: /generate insights/i }));
      await screen.findByText('Healthy');
      fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
      await waitFor(() => expect(mockGetInsights).toHaveBeenCalledTimes(2));
    });
  });
});
