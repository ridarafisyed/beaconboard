import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { LiveIndicator } from '@/components/LiveIndicator';
import { usePingStore } from '@/store/ping.store';

beforeEach(() => {
  usePingStore.setState({ connectionState: 'connecting', reconnectIn: 0 });
});

describe('LiveIndicator', () => {
  describe('connected state', () => {
    it('shows "Live" label', () => {
      usePingStore.setState({ connectionState: 'connected' });
      render(<LiveIndicator />);
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('uses green text color', () => {
      usePingStore.setState({ connectionState: 'connected' });
      const { container } = render(<LiveIndicator />);
      expect(container.querySelector('.text-green-700')).toBeInTheDocument();
    });

    it('shows a ping animation', () => {
      usePingStore.setState({ connectionState: 'connected' });
      const { container } = render(<LiveIndicator />);
      expect(container.querySelector('.animate-ping')).toBeInTheDocument();
    });
  });

  describe('connecting state', () => {
    it('shows "Connecting…" label', () => {
      usePingStore.setState({ connectionState: 'connecting' });
      render(<LiveIndicator />);
      expect(screen.getByText('Connecting…')).toBeInTheDocument();
    });

    it('uses yellow text color', () => {
      usePingStore.setState({ connectionState: 'connecting' });
      const { container } = render(<LiveIndicator />);
      expect(container.querySelector('.text-yellow-700')).toBeInTheDocument();
    });

    it('shows a ping animation', () => {
      usePingStore.setState({ connectionState: 'connecting' });
      const { container } = render(<LiveIndicator />);
      expect(container.querySelector('.animate-ping')).toBeInTheDocument();
    });
  });

  describe('offline state', () => {
    it('shows "Offline" when reconnectIn is 0', () => {
      usePingStore.setState({ connectionState: 'offline', reconnectIn: 0 });
      render(<LiveIndicator />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('shows countdown when reconnectIn > 0', () => {
      usePingStore.setState({ connectionState: 'offline', reconnectIn: 15 });
      render(<LiveIndicator />);
      expect(screen.getByText('Offline — retrying in 15s')).toBeInTheDocument();
    });

    it('updates the countdown text as reconnectIn changes', () => {
      usePingStore.setState({ connectionState: 'offline', reconnectIn: 5 });
      const { rerender } = render(<LiveIndicator />);
      expect(screen.getByText('Offline — retrying in 5s')).toBeInTheDocument();

      usePingStore.setState({ reconnectIn: 3 });
      rerender(<LiveIndicator />);
      expect(screen.getByText('Offline — retrying in 3s')).toBeInTheDocument();
    });

    it('uses red text color', () => {
      usePingStore.setState({ connectionState: 'offline', reconnectIn: 0 });
      const { container } = render(<LiveIndicator />);
      expect(container.querySelector('.text-red-700')).toBeInTheDocument();
    });

    it('has no ping animation', () => {
      usePingStore.setState({ connectionState: 'offline', reconnectIn: 0 });
      const { container } = render(<LiveIndicator />);
      expect(container.querySelector('.animate-ping')).not.toBeInTheDocument();
    });
  });
});
