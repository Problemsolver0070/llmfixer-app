import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const useAdminMetrics = vi.fn();
vi.mock('@/hooks/useAdminMetrics', () => ({ useAdminMetrics: () => useAdminMetrics() }));

import Metrics from './Metrics';

describe('Metrics page', () => {
  it('renders six cards with the metrics', async () => {
    useAdminMetrics.mockReturnValue({
      data: {
        total_users: 100, verified_users: 80, active_subs: 30,
        mrr_cents: 599700, signups_7d: 12, cancellations_7d: 1,
      },
      loading: false,
    });
    render(<Metrics />);
    await waitFor(() => expect(screen.getByText('100')).toBeInTheDocument());
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText(/\$5,997/)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
