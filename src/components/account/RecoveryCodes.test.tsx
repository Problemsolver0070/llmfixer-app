import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mintMock, fetchStatusMock, statusMock } = vi.hoisted(() => ({
  mintMock: vi.fn(),
  fetchStatusMock: vi.fn(),
  statusMock: {
    status: { remaining: 10, last_minted_at: '2026-05-01T00:00:00Z' },
    loading: false,
    error: null as string | null,
    reload: vi.fn(),
  },
}));

vi.mock('@/hooks/useMfaRecovery', () => ({
  mintRecoveryCodes: () => mintMock(),
  fetchRecoveryStatus: () => fetchStatusMock(),
  useMfaRecoveryStatus: () => statusMock,
}));

import { RecoveryCodes } from './RecoveryCodes';

beforeEach(() => {
  mintMock.mockReset();
  fetchStatusMock.mockReset();
});

describe('RecoveryCodes panel', () => {
  it('renders the resting state with remaining count', async () => {
    render(<RecoveryCodes />);
    await waitFor(() =>
      expect(screen.getByTestId('mfa-recovery-codes-panel')).toBeInTheDocument(),
    );
    expect(screen.getByText(/10 of 10 codes remaining/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /regenerate codes/i }),
    ).toBeInTheDocument();
  });

  it('shows just-minted codes when initialMint is passed', () => {
    render(
      <RecoveryCodes
        initialMint={{
          codes: ['AAAA-BBBB-CCCC', 'DDDD-EEEE-FFFF'],
          minted_at: '2026-05-03T00:00:00Z',
          invalidated_count: 0,
        }}
      />,
    );
    expect(screen.getByTestId('mfa-recovery-codes-mint')).toBeInTheDocument();
    expect(screen.getByText('AAAA-BBBB-CCCC')).toBeInTheDocument();
    expect(screen.getByText('DDDD-EEEE-FFFF')).toBeInTheDocument();
    expect(
      screen.getByText(/save these now\. they will not be shown again\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download \.txt/i })).toBeInTheDocument();
  });

  it('calls mintRecoveryCodes after the user confirms regenerate', async () => {
    mintMock.mockResolvedValueOnce({
      codes: ['ZZZZ-YYYY-XXXX'],
      minted_at: '2026-05-03T00:00:00Z',
      invalidated_count: 10,
    });
    render(<RecoveryCodes />);
    const regen = await screen.findByRole('button', { name: /regenerate codes/i });
    await userEvent.click(regen);
    // Confirmation panel surfaces a "Generate new codes" button.
    const confirm = await screen.findByRole('button', { name: /generate new codes/i });
    await userEvent.click(confirm);
    await waitFor(() => expect(mintMock).toHaveBeenCalledTimes(1));
    // After mint, the just-minted view shows the new code.
    await waitFor(() => expect(screen.getByText('ZZZZ-YYYY-XXXX')).toBeInTheDocument());
  });

  it('cancel out of regenerate confirmation goes back to resting', async () => {
    render(<RecoveryCodes />);
    await userEvent.click(
      await screen.findByRole('button', { name: /regenerate codes/i }),
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /^cancel$/i }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /generate new codes/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('dismisses the just-minted view when the user clicks "I have saved these codes"', async () => {
    render(
      <RecoveryCodes
        initialMint={{
          codes: ['AAAA-BBBB-CCCC'],
          minted_at: '2026-05-03T00:00:00Z',
          invalidated_count: 0,
        }}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /i have saved these codes/i }),
    );
    await waitFor(() =>
      expect(
        screen.queryByTestId('mfa-recovery-codes-mint'),
      ).not.toBeInTheDocument(),
    );
  });
});
