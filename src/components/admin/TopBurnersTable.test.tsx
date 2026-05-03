import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { TopBurnersTable } from './TopBurnersTable';
import type { TopBurner } from '@/hooks/useAdminMetrics';

function row(over: Partial<TopBurner>): TopBurner {
  return {
    user_id: 'u',
    email: 'a@example.com',
    output_tokens_this_week: 0,
    requests_this_week: 0,
    ...over,
  };
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('TopBurnersTable', () => {
  it('shows empty-state copy when there are no rows', () => {
    renderWithRouter(<TopBurnersTable rows={[]} />);
    expect(screen.getByText(/no usage in the last 7 days/i)).toBeInTheDocument();
  });

  it('sorts by output_tokens_this_week DESC', () => {
    renderWithRouter(
      <TopBurnersTable
        rows={[
          row({ user_id: 'u-low', email: 'low@example.com', output_tokens_this_week: 100 }),
          row({ user_id: 'u-high', email: 'high@example.com', output_tokens_this_week: 9000 }),
          row({ user_id: 'u-mid', email: 'mid@example.com', output_tokens_this_week: 1000 }),
        ]}
      />,
    );
    const emails = screen.getAllByRole('link').map((el) => el.textContent);
    expect(emails).toEqual(['high@example.com', 'mid@example.com', 'low@example.com']);
  });

  it('formats numeric columns with thousands separators', () => {
    renderWithRouter(
      <TopBurnersTable
        rows={[
          row({
            user_id: 'u1',
            email: 'a@example.com',
            output_tokens_this_week: 1234567,
            requests_this_week: 4321,
          }),
        ]}
      />,
    );
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
    expect(screen.getByText('4,321')).toBeInTheDocument();
  });

  it('links email to /app/admin/users/:user_id', () => {
    renderWithRouter(
      <TopBurnersTable
        rows={[row({ user_id: 'abc-123', email: 'a@example.com' })]}
      />,
    );
    const link = screen.getByRole('link', { name: 'a@example.com' });
    expect(link.getAttribute('href')).toBe('/app/admin/users/abc-123');
  });

  it('caps the rendered row count at limit', () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      row({
        user_id: `u${i}`,
        email: `u${i}@example.com`,
        output_tokens_this_week: 100 - i,
      }),
    );
    renderWithRouter(<TopBurnersTable rows={rows} limit={10} />);
    expect(screen.getAllByRole('link').length).toBe(10);
  });
});
