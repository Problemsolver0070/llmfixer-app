import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listFactors = vi.fn();
const enroll = vi.fn();
const challenge = vi.fn();
const verify = vi.fn();
const unenroll = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: () => listFactors(),
        enroll: (a: unknown) => enroll(a),
        challenge: (a: unknown) => challenge(a),
        verify: (a: unknown) => verify(a),
        unenroll: (a: unknown) => unenroll(a),
      },
    },
  },
}));

vi.mock('qrcode', () => ({
  default: {
    toString: vi.fn().mockResolvedValue('<svg data-testid="fake-svg"></svg>'),
  },
}));

import Security from './Security';

function renderAt(path = '/app/account/security') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Security />
    </MemoryRouter>,
  );
}

describe('Security page', () => {
  beforeEach(() => {
    listFactors.mockReset();
    enroll.mockReset();
    challenge.mockReset();
    verify.mockReset();
    unenroll.mockReset();
  });

  it('shows the Enable TOTP button when no factor is enrolled', async () => {
    listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    renderAt();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /enable totp/i })).toBeInTheDocument(),
    );
  });

  it('renders QR + secret after starting enrollment', async () => {
    listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    enroll.mockResolvedValue({
      data: {
        id: 'factor-1',
        type: 'totp',
        totp: {
          qr_code: 'svg-bytes',
          secret: 'JBSWY3DPEHPK3PXP',
          uri: 'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP',
        },
      },
      error: null,
    });
    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: /enable totp/i }));
    await waitFor(() => expect(screen.getByTestId('mfa-qr')).toBeInTheDocument());
    expect(screen.getByText(/JBSWY3DPEHPK3PXP/)).toBeInTheDocument();
    expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument();
  });

  it('verifies the entered code and shows MFA enabled', async () => {
    listFactors
      .mockResolvedValueOnce({ data: { all: [] }, error: null })
      .mockResolvedValueOnce({
        data: {
          all: [
            {
              id: 'factor-1',
              factor_type: 'totp',
              status: 'verified',
              created_at: '2026-05-03T00:00:00Z',
            },
          ],
        },
        error: null,
      });
    enroll.mockResolvedValue({
      data: {
        id: 'factor-1',
        type: 'totp',
        totp: { qr_code: 'svg', secret: 'S', uri: 'otpauth://totp/X' },
      },
      error: null,
    });
    challenge.mockResolvedValue({ data: { id: 'chal-1' }, error: null });
    verify.mockResolvedValue({ data: {}, error: null });

    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: /enable totp/i }));
    await screen.findByLabelText(/6-digit code/i);
    await userEvent.type(screen.getByLabelText(/6-digit code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify and enable/i }));

    await waitFor(() => expect(verify).toHaveBeenCalled());
    expect(verify).toHaveBeenCalledWith({
      factorId: 'factor-1',
      challengeId: 'chal-1',
      code: '123456',
    });
    await waitFor(() =>
      expect(screen.getAllByText(/mfa enabled\./i).length).toBeGreaterThan(0),
    );
  });

  it('shows the disable flow when a verified factor exists', async () => {
    listFactors.mockResolvedValue({
      data: {
        all: [
          {
            id: 'factor-1',
            factor_type: 'totp',
            status: 'verified',
            created_at: '2026-05-03T00:00:00Z',
          },
        ],
      },
      error: null,
    });
    renderAt();
    await waitFor(() => expect(screen.getByText(/MFA enabled\./i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^disable$/i })).toBeInTheDocument();
  });

  it('confirms before disabling and calls unenroll', async () => {
    listFactors.mockResolvedValue({
      data: {
        all: [
          {
            id: 'factor-1',
            factor_type: 'totp',
            status: 'verified',
            created_at: '2026-05-03T00:00:00Z',
          },
        ],
      },
      error: null,
    });
    unenroll.mockResolvedValue({ data: {}, error: null });

    renderAt();
    await userEvent.click(await screen.findByRole('button', { name: /^disable$/i }));
    expect(screen.getByRole('button', { name: /confirm disable/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /confirm disable/i }));
    await waitFor(() => expect(unenroll).toHaveBeenCalledWith({ factorId: 'factor-1' }));
  });
});
