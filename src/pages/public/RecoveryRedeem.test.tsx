import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { redeemMock, signOutMock, FakeApiError } = vi.hoisted(() => {
  class FakeApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown) {
      super(`API error ${status}`);
      this.status = status;
      this.body = body;
    }
  }
  return {
    redeemMock: vi.fn(),
    signOutMock: vi.fn(),
    FakeApiError,
  };
});

vi.mock('@/lib/api', () => ({ ApiError: FakeApiError }));
vi.mock('@/hooks/useMfaRecovery', () => ({
  redeemRecoveryCode: (code: string) => redeemMock(code),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: () => signOutMock(),
    },
  },
}));

import RecoveryRedeem from './RecoveryRedeem';

function renderAt(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={['/recovery']}>
      <Routes>
        <Route path="/recovery" element={<RecoveryRedeem />} />
        <Route path="/login" element={<p>login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  redeemMock.mockReset();
  signOutMock.mockReset();
  signOutMock.mockResolvedValue({ error: null });
});

describe('RecoveryRedeem page', () => {
  it('redeems a valid code, signs out, and routes to the login page', async () => {
    redeemMock.mockResolvedValueOnce({ re_enroll_required: true, factors_deleted: 1 });
    renderAt();
    await userEvent.type(
      screen.getByLabelText(/recovery code/i),
      'ABCD-EFGH-JKMN',
    );
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));
    await waitFor(() => expect(redeemMock).toHaveBeenCalledWith('ABCD-EFGH-JKMN'));
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(await screen.findByText(/login page/i)).toBeInTheDocument();
  });

  it('shows a friendly error on 404 and does not sign out', async () => {
    redeemMock.mockRejectedValueOnce(new FakeApiError(404, { code: 'code_invalid' }));
    renderAt();
    await userEvent.type(screen.getByLabelText(/recovery code/i), 'WRONG');
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));
    expect(
      await screen.findByText(/code not recognised/i),
    ).toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it('shows a different error on 409 (already used)', async () => {
    redeemMock.mockRejectedValueOnce(new FakeApiError(409, { code: 'code_already_used' }));
    renderAt();
    await userEvent.type(screen.getByLabelText(/recovery code/i), 'ABCD-EFGH-JKMN');
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));
    expect(await screen.findByText(/code already used/i)).toBeInTheDocument();
  });
});
