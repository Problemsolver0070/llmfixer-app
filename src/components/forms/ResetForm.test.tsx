import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const updateUser = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { updateUser: (a: unknown) => updateUser(a) } },
}));

import { ResetForm } from './ResetForm';

function shell() {
  return render(
    <MemoryRouter initialEntries={['/reset']}>
      <Routes>
        <Route path="/reset" element={<ResetForm />} />
        <Route path="/login" element={<p>login here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResetForm', () => {
  beforeEach(() => updateUser.mockReset());

  it('rejects non-matching passwords', async () => {
    shell();
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'different');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updates the password and redirects to /login', async () => {
    updateUser.mockResolvedValue({ data: {}, error: null });
    shell();
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'abcdefgh');
    await userEvent.type(screen.getByLabelText(/confirm/i), 'abcdefgh');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));
    expect(updateUser).toHaveBeenCalledWith({ password: 'abcdefgh' });
    await waitFor(() => expect(screen.getByText('login here')).toBeInTheDocument());
  });
});
