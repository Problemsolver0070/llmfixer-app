import { render, screen, waitFor } from '@testing-library/react';
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

import { SignUpForm } from './SignUpForm';
import { api, ApiError } from '@/lib/api';

function renderForm(initialEntry: string = '/signup') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SignUpForm />
    </MemoryRouter>,
  );
}

async function fillBaseFields(opts: {
  name?: string;
  email?: string;
  password?: string;
} = {}) {
  await userEvent.type(screen.getByLabelText(/^name$/i), opts.name ?? 'Ada Lovelace');
  await userEvent.type(screen.getByLabelText(/email/i), opts.email ?? 'a@b.c');
  await userEvent.type(screen.getByLabelText(/password/i), opts.password ?? 'longenough');
}

describe('SignUpForm', () => {
  beforeEach(() => {
    signUp.mockReset();
    resend.mockReset();
    vi.mocked(api).mockReset();
  });

  it('rejects passwords shorter than 8 characters', async () => {
    renderForm();
    await fillBaseFields({ password: 'short' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('rejects empty or whitespace-only names', async () => {
    renderForm();
    // Fill email and password but leave name as whitespace.
    await userEvent.type(screen.getByLabelText(/^name$/i), '   ');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/please enter your name/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('signs up with the post-signup redirect, full_name, and shows the inline success state', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
    });
    renderForm();
    await fillBaseFields({ name: 'Ada Lovelace' });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).toHaveBeenCalledWith({
      email: 'a@b.c',
      password: 'longenough',
      options: {
        emailRedirectTo: expect.stringMatching(/\/app\/post-signup$/),
        data: { full_name: 'Ada Lovelace' },
      },
    });
    expect(api).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('a@b.c')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
  });

  it('trims surrounding whitespace from the name before submitting', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
    });
    renderForm();
    await userEvent.type(screen.getByLabelText(/^name$/i), '  Grace  ');
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: { full_name: 'Grace' },
        }),
      }),
    );
  });

  it('lets the user resend the verification email from the success state', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
      error: null,
    });
    resend.mockResolvedValue({ error: null });
    renderForm();
    await fillBaseFields();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/check your inbox/i);
    await userEvent.click(screen.getByRole('button', { name: /resend email/i }));
    expect(resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@b.c',
      options: { emailRedirectTo: expect.stringMatching(/\/app\/post-signup$/) },
    });
    await waitFor(() => expect(screen.getByText(/new link sent/i)).toBeInTheDocument());
  });

  it('lets the user step back with a different email', async () => {
    signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });
    renderForm();
    await fillBaseFields();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/check your inbox/i);
    await userEvent.click(screen.getByRole('button', { name: /use a different email/i }));
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('surfaces a server error inline', async () => {
    signUp.mockResolvedValue({ data: {}, error: { message: 'User already registered' } });
    renderForm();
    await fillBaseFields();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already registered/i);
  });

  describe('referral code', () => {
    it('claims the referral code after a successful signup', async () => {
      signUp.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
        error: null,
      });
      vi.mocked(api).mockResolvedValue({});
      renderForm();
      await fillBaseFields();
      await userEvent.type(screen.getByLabelText(/referral code/i), 'ABCD1234');
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(signUp).toHaveBeenCalled();
      await waitFor(() =>
        expect(api).toHaveBeenCalledWith('/v1/referrals/claim', {
          method: 'POST',
          body: { code: 'ABCD1234' },
        }),
      );
      await waitFor(() =>
        expect(screen.getByText(/12-hour demo started/i)).toBeInTheDocument(),
      );
    });

    it('auto-uppercases lowercase referral input', async () => {
      signUp.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
        error: null,
      });
      vi.mocked(api).mockResolvedValue({});
      renderForm();
      await fillBaseFields();
      const refInput = screen.getByLabelText(/referral code/i) as HTMLInputElement;
      await userEvent.type(refInput, 'abcd1234');
      expect(refInput.value).toBe('ABCD1234');
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      await waitFor(() =>
        expect(api).toHaveBeenCalledWith('/v1/referrals/claim', {
          method: 'POST',
          body: { code: 'ABCD1234' },
        }),
      );
    });

    it('prefills from ?ref= when the URL parameter matches the format', async () => {
      renderForm('/signup?ref=WXYZ7890');
      const refInput = screen.getByLabelText(/referral code/i) as HTMLInputElement;
      await waitFor(() => expect(refInput.value).toBe('WXYZ7890'));
    });

    it('ignores ?ref= when it does not match the 8-char alphanumeric format', async () => {
      renderForm('/signup?ref=bad');
      const refInput = screen.getByLabelText(/referral code/i) as HTMLInputElement;
      // brief tick to allow effect; should not populate
      await waitFor(() => expect(refInput.value).toBe(''));
    });

    it('blocks submit when the typed referral code is invalid format', async () => {
      renderForm();
      await fillBaseFields();
      await userEvent.type(screen.getByLabelText(/referral code/i), 'abc');
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(
        await screen.findByText(/8 letters or numbers/i),
      ).toBeInTheDocument();
      expect(signUp).not.toHaveBeenCalled();
      expect(api).not.toHaveBeenCalled();
    });

    it('shows the cap-reached copy when the claim returns referrer_cap_reached', async () => {
      signUp.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
        error: null,
      });
      vi.mocked(api).mockRejectedValueOnce(
        new ApiError(400, { detail: { error_code: 'referrer_cap_reached' } }),
      );
      renderForm();
      await fillBaseFields();
      await userEvent.type(screen.getByLabelText(/referral code/i), 'ABCD1234');
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      await screen.findByText(/check your inbox/i);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/at its limit/i);
      expect(alert).toHaveTextContent(/signed up/i);
    });

    it('shows the code-not-found copy when the claim returns 404', async () => {
      signUp.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
        error: null,
      });
      vi.mocked(api).mockRejectedValueOnce(
        new ApiError(404, { detail: { error_code: 'code_not_found' } }),
      );
      renderForm();
      await fillBaseFields();
      await userEvent.type(screen.getByLabelText(/referral code/i), 'ABCD1234');
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      await screen.findByText(/check your inbox/i);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/not found/i);
    });

    it('falls back to a network-error message when the claim throws non-ApiError', async () => {
      signUp.mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.c' }, session: null },
        error: null,
      });
      vi.mocked(api).mockRejectedValueOnce(new Error('network down'));
      renderForm();
      await fillBaseFields();
      await userEvent.type(screen.getByLabelText(/referral code/i), 'ABCD1234');
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      await screen.findByText(/check your inbox/i);
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/couldn't apply the referral code/i);
      expect(alert).toHaveTextContent(/signed up/i);
    });
  });
});
