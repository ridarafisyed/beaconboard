import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Pagination } from '@/components/Pagination';

describe('Pagination', () => {
  describe('rendering nothing', () => {
    it('returns null when totalPages is 0', () => {
      const { container } = render(<Pagination page={1} totalPages={0} onPageChange={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when totalPages is 1', () => {
      const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('rendering controls', () => {
    it('renders when totalPages > 1', () => {
      render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });

    it('shows the current page and total pages', () => {
      render(<Pagination page={2} totalPages={7} onPageChange={vi.fn()} />);
      expect(screen.getByText('Page 2 of 7')).toBeInTheDocument();
    });
  });

  describe('disabled states', () => {
    it('disables Previous on the first page', () => {
      render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    });

    it('disables Next on the last page', () => {
      render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    it('enables both buttons on a middle page', () => {
      render(<Pagination page={3} totalPages={5} onPageChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
    });

    it('enables Next on the first page', () => {
      render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
    });

    it('enables Previous on the last page', () => {
      render(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Previous' })).not.toBeDisabled();
    });
  });

  describe('navigation', () => {
    it('calls onPageChange with page - 1 when Previous is clicked', async () => {
      const onPageChange = vi.fn();
      render(<Pagination page={4} totalPages={10} onPageChange={onPageChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it('calls onPageChange with page + 1 when Next is clicked', async () => {
      const onPageChange = vi.fn();
      render(<Pagination page={4} totalPages={10} onPageChange={onPageChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(onPageChange).toHaveBeenCalledWith(5);
    });

    it('calls onPageChange exactly once per click', async () => {
      const onPageChange = vi.fn();
      render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
      await userEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(onPageChange).toHaveBeenCalledOnce();
    });
  });
});
