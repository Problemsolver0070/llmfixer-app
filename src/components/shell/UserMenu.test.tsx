import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

import { UserMenu } from './UserMenu';

function renderMenu() {
  return render(
    <MemoryRouter>
      <div>
        <UserMenu email="user@example.com" />
        <button type="button" data-testid="outside">outside</button>
      </div>
    </MemoryRouter>,
  );
}

describe('UserMenu', () => {
  it('toggles open state when the email button is clicked', async () => {
    renderMenu();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /user@example\.com/i }));
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('closes when clicking outside the menu', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /user@example\.com/i }));
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('stays open when clicking inside the menu', async () => {
    renderMenu();
    await userEvent.click(screen.getByRole('button', { name: /user@example\.com/i }));
    const signOut = screen.getByRole('button', { name: /sign out/i });
    expect(signOut).toBeInTheDocument();
    // Click on the menu container itself (not the trigger button) and verify
    // the sign-out button stays.
    const menuRegion = signOut.parentElement!;
    await userEvent.click(menuRegion);
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});
