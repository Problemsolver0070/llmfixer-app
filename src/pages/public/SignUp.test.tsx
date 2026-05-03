import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const signUp = vi.fn();
const resend = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (args: unknown) => signUp(args),
      resend: (args: unknown) => resend(args),
    },
  },
}));

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown, message?: string) {
      super(message ?? `API error ${status}`);
      this.status = status;
      this.body = body;
    }
  },
  api: vi.fn(),
}));

import SignUp from './SignUp';

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SignUp />
    </MemoryRouter>,
  );
}

describe('SignUp page', () => {
  beforeEach(() => {
    signUp.mockReset();
    resend.mockReset();
  });

  it('threads ?invite=<token> into the Supabase emailRedirectTo URL', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'ben@acme.io' }, session: null },
      error: null,
    });
    renderAt('/signup?invite=TOKEN-X');
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Ben');
    await userEvent.type(screen.getByLabelText(/email/i), 'ben@acme.io');
    await userEvent.type(screen.getByLabelText(/password/i), 'long-password-123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/app/workspace/accept?token=TOKEN-X'),
        }),
      }),
    );
  });

  it('falls back to the dashboard redirect when no invite token is present', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
    });
    renderAt('/signup');
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Ada');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(/\/app\/dashboard$/),
        }),
      }),
    );
  });

  it('url-encodes invite tokens that contain special characters', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
    });
    renderAt('/signup?invite=tok%2Fwith%20space');
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Ada');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining(
            '/app/workspace/accept?token=tok%2Fwith%20space',
          ),
        }),
      }),
    );
  });
});
