import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAdminPromosMock = vi.fn();
vi.mock('@/hooks/useAdminPromos', () => ({ useAdminPromos: () => useAdminPromosMock() }));

import Promos from './Promos';

describe('Promos page', () => {
  it('renders create form and the list', () => {
    useAdminPromosMock.mockReturnValue({
      promos: [
        { id: 'p1', code: 'GIFT30', type: 'free_time', amount_int: 30,
          max_redemptions: null, expires_at: null, active: true, created_at: '2026-01-01' },
      ],
      loading: false,
      create: vi.fn(), toggleActive: vi.fn(), remove: vi.fn(), refresh: vi.fn(),
    });
    render(<MemoryRouter><Promos /></MemoryRouter>);
    expect(screen.getAllByText(/create promo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('GIFT30')).toBeInTheDocument();
  });
});
