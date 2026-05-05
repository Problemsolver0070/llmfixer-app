import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ChatNavLink } from './ChatNavLink';

describe('ChatNavLink', () => {
  it('renders an external link to chat.thefixer.in for any signed-in user', () => {
    render(<ChatNavLink />);
    const link = screen.getByRole('link', { name: /the fixer ai/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://chat.thefixer.in');
  });

  it('uses the same nav-tab class as internal tabs for visual parity', () => {
    render(<ChatNavLink />);
    const link = screen.getByRole('link', { name: /the fixer ai/i });
    expect(link).toHaveClass('app-nav-tab');
  });
});
