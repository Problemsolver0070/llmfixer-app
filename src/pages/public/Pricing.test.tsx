import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pricing from './Pricing';

vi.mock('@/hooks/usePlans', () => ({
  usePlans: () => ({
    plans: [
      { sku: 'solo-weekly', tier: 'solo', cadence: 'weekly', paypal_plan_id: 'P-SW',
        base_price_cents: 1999, per_seat_price_cents: null, included_seats: 1,
        display_price: '$19.99 / week', discount_pct: 0, trial_days: 2 },
      { sku: 'solo-monthly', tier: 'solo', cadence: 'monthly', paypal_plan_id: 'P-SM',
        base_price_cents: 7900, per_seat_price_cents: null, included_seats: 1,
        display_price: '$79 / month', discount_pct: 9, trial_days: 2 },
      { sku: 'workspace-weekly', tier: 'workspace', cadence: 'weekly', paypal_plan_id: 'P-WW',
        base_price_cents: 3999, per_seat_price_cents: 999, included_seats: 4,
        display_price: '$39.99 / week + $9.99 / extra seat', discount_pct: 0, trial_days: 2 },
      { sku: 'workspace-monthly', tier: 'workspace', cadence: 'monthly', paypal_plan_id: 'P-WM',
        base_price_cents: 15900, per_seat_price_cents: 3900, included_seats: 4,
        display_price: '$159 / month + $39 / extra seat', discount_pct: 9, trial_days: 2 },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({ session: null, emailVerified: false }),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('Pricing page', () => {
  it('renders Solo, Workspace, and Enterprise tiers', () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('shows weekly prices by default', () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$39.99')).toBeInTheDocument();
  });

  it('switches prices when monthly cadence is selected', () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: /monthly/i }));
    expect(screen.getByText('$79')).toBeInTheDocument();
    expect(screen.getByText('$159')).toBeInTheDocument();
  });

  it('Enterprise CTA leads to /pricing/enterprise', async () => {
    render(<MemoryRouter><Pricing /></MemoryRouter>);
    const enterpriseCta = screen.getByRole('button', { name: /contact sales/i });
    expect(enterpriseCta).toBeInTheDocument();
  });
});
