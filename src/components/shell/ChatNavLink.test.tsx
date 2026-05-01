import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const useAccount = vi.fn();
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => useAccount() }));

import { ChatNavLink } from './ChatNavLink';

describe('ChatNavLink', () => {
  it('renders an external link to chat.thefixer.in when subscription is active', () => {
    useAccount.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      hasActiveSubscription: true,
      refresh: async () => {},
    });
    render(<ChatNavLink />);
    const link = screen.getByRole('link', { name: /chat/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://chat.thefixer.in');
  });

  it('renders nothing when there is no active subscription', () => {
    useAccount.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      hasActiveSubscription: false,
      refresh: async () => {},
    });
    const { container } = render(<ChatNavLink />);
    expect(container.firstChild).toBeNull();
  });

  it('uses the same nav-tab class as internal tabs for visual parity', () => {
    useAccount.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      hasActiveSubscription: true,
      refresh: async () => {},
    });
    render(<ChatNavLink />);
    const link = screen.getByRole('link', { name: /chat/i });
    expect(link).toHaveClass('app-nav-tab');
  });
});
