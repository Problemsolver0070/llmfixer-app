import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { PostSignupGate } from './PostSignupGate';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/post-signup" element={<PostSignupGate />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PostSignupGate', () => {
  let hrefSetter: ReturnType<typeof vi.fn<(value: string) => void>>;
  let originalLocation: Location;

  beforeEach(() => {
    vi.useFakeTimers();
    hrefSetter = vi.fn<(value: string) => void>();
    originalLocation = window.location;
    // Replace window.location so we can capture the redirect target
    // without actually navigating in jsdom.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        get href() {
          return originalLocation.href;
        },
        set href(value: string) {
          hrefSetter(value);
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.useRealTimers();
  });

  it('renders a redirect status while the timer is pending', () => {
    renderAt('/app/post-signup');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/taking you to the fixer/i);
    expect(status).toHaveAttribute('data-redirect-target', 'https://chat.thefixer.in');
  });

  it('redirects to https://chat.thefixer.in after a 200ms delay', () => {
    renderAt('/app/post-signup');
    expect(hrefSetter).not.toHaveBeenCalled();

    // 199ms is not enough; the redirect must wait the full 200ms.
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(hrefSetter).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(hrefSetter).toHaveBeenCalledWith('https://chat.thefixer.in');
    expect(hrefSetter).toHaveBeenCalledTimes(1);
  });

  it('does not navigate if the component unmounts before the delay', () => {
    const { unmount } = renderAt('/app/post-signup');
    unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(hrefSetter).not.toHaveBeenCalled();
  });
});
