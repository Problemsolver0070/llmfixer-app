import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const useAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));

import { TheFixerAiCard } from './TheFixerAiCard';

describe('TheFixerAiCard', () => {
  it('renders the CTA when hasActiveSubscription=true', () => {
    useAccount.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: async () => {},
      hasActiveSubscription: true,
    });
    render(<TheFixerAiCard />);
    expect(screen.getByText(/the fixer ai/i)).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://chat.thefixer.in');
  });

  it('renders nothing when hasActiveSubscription=false', () => {
    useAccount.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refresh: async () => {},
      hasActiveSubscription: false,
    });
    const { container } = render(<TheFixerAiCard />);
    expect(container).toBeEmptyDOMElement();
  });
});
