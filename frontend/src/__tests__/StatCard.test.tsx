import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { StatCard } from '@/components/StatCard';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total Pings" value={42} />);
    expect(screen.getByText('Total Pings')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard title="Total Pings" value={42} subtitle="all time" />);
    expect(screen.getByText('all time')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    render(<StatCard title="Total Pings" value={42} />);
    expect(screen.queryByText('all time')).not.toBeInTheDocument();
  });

  it('applies green accent class', () => {
    const { container } = render(<StatCard title="Rate" value="95%" accent="green" />);
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();
  });

  it('applies red accent class', () => {
    const { container } = render(<StatCard title="Rate" value="30%" accent="red" />);
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();
  });
});
