import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { PingTable } from '@/components/PingTable';
import type { PingResult } from '@/lib/types';

const mockResult: PingResult = {
  id: 'test-id-1',
  requestId: 'req-uuid-abcdef12',
  timestamp: '2026-06-11T12:00:00.000Z',
  statusCode: 200,
  responseTimeMs: 123,
  eventType: 'health_check',
  environment: 'development',
  retry: false,
  responseBody: { json: true },
  createdAt: '2026-06-11T12:00:00.000Z',
};

describe('PingTable', () => {
  it('renders column headers', () => {
    render(<PingTable results={[]} />);
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Event Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    render(<PingTable results={[]} />);
    expect(screen.getByText(/no monitoring records yet/i)).toBeInTheDocument();
    expect(screen.getByText(/trigger your first ping/i)).toBeInTheDocument();
  });

  it('renders a row for each result', () => {
    const results = [
      mockResult,
      { ...mockResult, id: 'test-id-2', eventType: 'latency_test' },
    ];
    render(<PingTable results={results} />);
    expect(screen.getByText('health_check')).toBeInTheDocument();
    expect(screen.getByText('latency_test')).toBeInTheDocument();
  });

  it('renders status badge with correct code', () => {
    render(<PingTable results={[mockResult]} />);
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('renders response time with ms suffix', () => {
    render(<PingTable results={[mockResult]} />);
    expect(screen.getByText('123 ms')).toBeInTheDocument();
  });

  it('renders truncated request ID', () => {
    render(<PingTable results={[mockResult]} />);
    expect(screen.getByText(/req-uuid/)).toBeInTheDocument();
  });

  it('expands row detail panel on click', async () => {
    render(<PingTable results={[mockResult]} />);
    const row = screen.getByText('health_check').closest('tr')!;
    await userEvent.click(row);
    expect(screen.getByText('Request Payload')).toBeInTheDocument();
    expect(screen.getByText('Response Body')).toBeInTheDocument();
  });
});
