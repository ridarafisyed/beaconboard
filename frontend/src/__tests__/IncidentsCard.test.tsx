import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { IncidentsCard } from '@/components/IncidentsCard';
import type { PingResult } from '@/lib/types';

let idCounter = 0;
function makeResult(overrides: Partial<PingResult> = {}): PingResult {
  return {
    id: String(++idCounter),
    requestId: 'req-id',
    statusCode: 200,
    responseTimeMs: 100,
    eventType: 'health_check',
    environment: 'test',
    retry: false,
    responseBody: {},
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('IncidentsCard', () => {
  describe('empty / success state', () => {
    it('shows "No failures detected 🎉" when all results are 2xx', () => {
      render(<IncidentsCard results={[makeResult({ statusCode: 200 }), makeResult({ statusCode: 201 })]} />);
      expect(screen.getByText(/no failures detected/i)).toBeInTheDocument();
    });

    it('shows the green success card when there are no failures', () => {
      const { container } = render(<IncidentsCard results={[makeResult({ statusCode: 200 })]} />);
      expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
    });

    it('does not show "Recent Failures" heading in success state', () => {
      render(<IncidentsCard results={[makeResult({ statusCode: 200 })]} />);
      expect(screen.queryByText('Recent Failures')).not.toBeInTheDocument();
    });
  });

  describe('failure state', () => {
    it('shows "Recent Failures" heading when failures exist', () => {
      render(<IncidentsCard results={[makeResult({ statusCode: 500 })]} />);
      expect(screen.getByText('Recent Failures')).toBeInTheDocument();
    });

    it('shows the event type for each failure', () => {
      render(<IncidentsCard results={[makeResult({ statusCode: 500, eventType: 'latency_test' })]} />);
      expect(screen.getByText('latency_test')).toBeInTheDocument();
    });

    it('shows the status badge for each failure', () => {
      render(<IncidentsCard results={[makeResult({ statusCode: 503 })]} />);
      expect(screen.getByText('503')).toBeInTheDocument();
    });

    it('caps the failure list at 5 even when more exist', () => {
      const results = Array.from({ length: 8 }, () => makeResult({ statusCode: 500 }));
      render(<IncidentsCard results={results} />);
      expect(screen.getAllByText('500')).toHaveLength(5);
    });

    it('uses the red card style for failures', () => {
      const { container } = render(<IncidentsCard results={[makeResult({ statusCode: 503 })]} />);
      expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
    });

    it('does not show success state when failures exist', () => {
      render(<IncidentsCard results={[makeResult({ statusCode: 500 })]} />);
      expect(screen.queryByText(/no failures detected/i)).not.toBeInTheDocument();
    });
  });

  describe('mixed results', () => {
    it('shows failure card when there is at least one non-2xx result', () => {
      render(<IncidentsCard results={[makeResult({ statusCode: 200 }), makeResult({ statusCode: 404 })]} />);
      expect(screen.getByText('Recent Failures')).toBeInTheDocument();
    });

    it('only shows failures in the list, not 2xx results', () => {
      render(<IncidentsCard results={[makeResult({ statusCode: 200 }), makeResult({ statusCode: 503 })]} />);
      expect(screen.queryByText('200')).not.toBeInTheDocument();
      expect(screen.getByText('503')).toBeInTheDocument();
    });
  });
});
