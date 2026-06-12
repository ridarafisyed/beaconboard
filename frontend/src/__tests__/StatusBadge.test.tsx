import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { StatusBadge } from '@/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders the status code', () => {
    render(<StatusBadge statusCode={200} />);
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('applies green styling for 2xx codes', () => {
    render(<StatusBadge statusCode={200} />);
    expect(screen.getByText('200')).toHaveClass('bg-green-100');
  });

  it('applies yellow styling for 4xx codes', () => {
    render(<StatusBadge statusCode={404} />);
    expect(screen.getByText('404')).toHaveClass('bg-yellow-100');
  });

  it('applies red styling for 5xx codes', () => {
    render(<StatusBadge statusCode={503} />);
    expect(screen.getByText('503')).toHaveClass('bg-red-100');
  });

  it('applies blue styling for 3xx codes', () => {
    render(<StatusBadge statusCode={301} />);
    expect(screen.getByText('301')).toHaveClass('bg-blue-100');
  });
});
