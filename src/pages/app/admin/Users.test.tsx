import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useAdminUsers = vi.fn();
vi.mock('@/hooks/useAdminUsers', () => ({ useAdminUsers: () => useAdminUsers() }));

import Users from './Users';

function renderUsers() {
  return render(
    <MemoryRouter>
      <Users />
    </MemoryRouter>,
  );
}

describe('Admin Users', () => {
  it('searches and shows results', async () => {
    const search = vi.fn();
    useAdminUsers.mockReturnValue({
      results: [
        { id: 'u1', email: 'a@b.c', role: 'user', status: 'trial', trial_ends_at: '2099-01-01' },
      ],
      loading: false, search,
      comp: vi.fn(), extendTrial: vi.fn(), lock: vi.fn(),
    });
    renderUsers();
    await userEvent.type(screen.getByPlaceholderText(/search by email/i), 'a@b');
    await userEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(search).toHaveBeenCalledWith('a@b');
    await waitFor(() => expect(screen.getByText('a@b.c')).toBeInTheDocument());
  });

  it('manage link points to UserDetail route', () => {
    useAdminUsers.mockReturnValue({
      results: [
        { id: 'u-42', email: 'foo@bar.com', role: 'user', status: 'active', trial_ends_at: null },
      ],
      loading: false,
      search: vi.fn(),
      comp: vi.fn(),
      extendTrial: vi.fn(),
      lock: vi.fn(),
    });
    renderUsers();
    const link = screen.getByRole('link', { name: /manage/i });
    expect(link).toHaveAttribute('href', '/app/admin/users/u-42');
  });
});
