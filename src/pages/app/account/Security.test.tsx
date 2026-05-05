import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    toDataURL: vi
      .fn()
      .mockResolvedValue(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      ),
  },
}));

// The recovery codes panel mounted by Security.tsx hits the backend
// for status + mint. Stub the helpers so the existing Security tests
// don't need to reason about the recovery flow.
vi.mock('@/hooks/useMfaRecovery', () => ({
  mintRecoveryCodes: vi.fn().mockResolvedValue({
    codes: [],
    minted_at: '2026-05-03T00:00:00Z',
    invalidated_count: 0,
  }),
  fetchRecoveryStatus: vi.fn().mockResolvedValue({ remaining: 0, last_minted_at: null }),
  useMfaRecoveryStatus: () => ({
    status: { remaining: 0, last_minted_at: null },
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
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
    // F25: the QR must be rendered as an <img> with a data: URL src,
    // NOT injected via dangerouslySetInnerHTML.
    const qr = screen.getByTestId('mfa-qr');
    const img = within(qr).getByRole('img', { name: /mfa qr code/i });
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toMatch(/^data:image\//);
    expect(qr.innerHTML).not.toMatch(/<svg/i);
    expect(screen.getByText(/JBSWY3DPEHPK3PXP/)).toBeInTheDocument();
    expect(screen.getByLabelText(/6-digit code/i)).toBeInTheDocument();
  });

  it('does not use dangerouslySetInnerHTML anywhere in Security.tsx (F25)', () => {
    // Belt-and-braces guard so a future refactor doesn't reintroduce
    // the innerHTML sink. Read the source file off disk and assert.
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/app/account/Security.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/dangerouslySetInnerHTML/);
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
