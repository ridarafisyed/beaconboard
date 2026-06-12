import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { FilterBar } from '@/components/FilterBar';

const defaultProps = {
  status: 'all' as const,
  event: 'all' as const,
  date: 'all' as const,
  onStatus: vi.fn(),
  onEvent: vi.fn(),
  onDate: vi.fn(),
};

describe('FilterBar', () => {
  describe('rendering', () => {
    it('renders all filter group labels', () => {
      render(<FilterBar {...defaultProps} />);
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Event')).toBeInTheDocument();
      expect(screen.getByText('Range')).toBeInTheDocument();
    });

    it('renders all status options', () => {
      render(<FilterBar {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Success (2xx)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Error' })).toBeInTheDocument();
    });

    it('renders all event options', () => {
      render(<FilterBar {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Health' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Probe' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Latency' })).toBeInTheDocument();
    });

    it('renders all range options', () => {
      render(<FilterBar {...defaultProps} />);
      expect(screen.getByRole('button', { name: '1h' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '24h' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    });
  });

  describe('active state', () => {
    it('highlights the active status pill with dark background', () => {
      render(<FilterBar {...defaultProps} status="2xx" />);
      expect(screen.getByRole('button', { name: 'Success (2xx)' }).className).toContain('bg-gray-900');
    });

    it('highlights the active event pill', () => {
      render(<FilterBar {...defaultProps} event="latency_test" />);
      expect(screen.getByRole('button', { name: 'Latency' }).className).toContain('bg-gray-900');
    });

    it('highlights the active range pill', () => {
      render(<FilterBar {...defaultProps} date="last_24h" />);
      expect(screen.getByRole('button', { name: '24h' }).className).toContain('bg-gray-900');
    });

    it('inactive pills do not have the dark background', () => {
      render(<FilterBar {...defaultProps} status="2xx" />);
      expect(screen.getByRole('button', { name: 'Error' }).className).not.toContain('bg-gray-900');
    });
  });

  describe('interactions', () => {
    it('calls onStatus with "2xx" when Success pill is clicked', async () => {
      const onStatus = vi.fn();
      render(<FilterBar {...defaultProps} onStatus={onStatus} />);
      await userEvent.click(screen.getByRole('button', { name: 'Success (2xx)' }));
      expect(onStatus).toHaveBeenCalledWith('2xx');
    });

    it('calls onStatus with "error" when Error pill is clicked', async () => {
      const onStatus = vi.fn();
      render(<FilterBar {...defaultProps} onStatus={onStatus} />);
      await userEvent.click(screen.getByRole('button', { name: 'Error' }));
      expect(onStatus).toHaveBeenCalledWith('error');
    });

    it('calls onEvent with "health_check" when Health pill is clicked', async () => {
      const onEvent = vi.fn();
      render(<FilterBar {...defaultProps} onEvent={onEvent} />);
      await userEvent.click(screen.getByRole('button', { name: 'Health' }));
      expect(onEvent).toHaveBeenCalledWith('health_check');
    });

    it('calls onEvent with "status_probe" when Probe pill is clicked', async () => {
      const onEvent = vi.fn();
      render(<FilterBar {...defaultProps} onEvent={onEvent} />);
      await userEvent.click(screen.getByRole('button', { name: 'Probe' }));
      expect(onEvent).toHaveBeenCalledWith('status_probe');
    });

    it('calls onDate with "last_hour" when 1h pill is clicked', async () => {
      const onDate = vi.fn();
      render(<FilterBar {...defaultProps} onDate={onDate} />);
      await userEvent.click(screen.getByRole('button', { name: '1h' }));
      expect(onDate).toHaveBeenCalledWith('last_hour');
    });

    it('calls onDate with "last_7d" when 7d pill is clicked', async () => {
      const onDate = vi.fn();
      render(<FilterBar {...defaultProps} onDate={onDate} />);
      await userEvent.click(screen.getByRole('button', { name: '7d' }));
      expect(onDate).toHaveBeenCalledWith('last_7d');
    });

    it('calls each handler only once per click', async () => {
      const onStatus = vi.fn();
      render(<FilterBar {...defaultProps} onStatus={onStatus} />);
      await userEvent.click(screen.getByRole('button', { name: 'Error' }));
      expect(onStatus).toHaveBeenCalledOnce();
    });
  });
});
