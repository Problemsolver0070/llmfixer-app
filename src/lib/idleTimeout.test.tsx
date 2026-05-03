import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const signOut = vi.fn();
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signOut: () => signOut(),
    },
  },
}));

import { useAdminIdleTimeout, ADMIN_IDLE_TIMEOUT_MS } from './idleTimeout';

function Probe() {
  useAdminIdleTimeout();
  return <div>probe</div>;
}

let assigned: string | null;
let originalLocation: Location;
let pathname: string;

function installLocationStub(initialPath: string) {
  pathname = initialPath;
  assigned = null;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      get pathname() {
        return pathname;
      },
      get search() {
        return '';
      },
      assign(value: string) {
        assigned = value;
      },
      origin: 'https://thefixer.in',
    },
  });
}

describe('useAdminIdleTimeout', () => {
  beforeEach(() => {
    signOut.mockReset();
    signOut.mockResolvedValue(undefined);
    originalLocation = window.location;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('does not sign out when user is not on /app/admin/*', async () => {
    installLocationStub('/app/dashboard');
    render(<Probe />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADMIN_IDLE_TIMEOUT_MS + 60_000);
    });
    expect(signOut).not.toHaveBeenCalled();
    expect(assigned).toBeNull();
  });

  it('signs out and redirects when idle >30 min on /app/admin/*', async () => {
    installLocationStub('/app/admin/users');
    render(<Probe />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADMIN_IDLE_TIMEOUT_MS + 60_000);
    });
    expect(signOut).toHaveBeenCalled();
    expect(assigned).toMatch(/^\/login\?expired=1/);
  });

  it('mousemove resets the idle clock', async () => {
    installLocationStub('/app/admin/users');
    render(<Probe />);
    // Advance halfway, then bump activity, then advance another partial-but-under-total interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADMIN_IDLE_TIMEOUT_MS / 2);
    });
    await act(async () => {
      window.dispatchEvent(new MouseEvent('mousemove'));
      await vi.advanceTimersByTimeAsync(ADMIN_IDLE_TIMEOUT_MS / 2 + 30_000);
    });
    // Total elapsed > timeout, but reset midway means we should NOT have expired yet.
    expect(signOut).not.toHaveBeenCalled();
  });
});
