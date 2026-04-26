import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

const useSession = vi.fn();
vi.mock('@/hooks/useSession', () => ({ useSession: () => useSession() }));

import Landing from './Landing';

describe('Landing', () => {
  it('shows Sign in and Create account links when signed out', () => {
    useSession.mockReturnValue({ session: null, user: null, loading: false, emailVerified: false });
    render(<MemoryRouter><Landing /></MemoryRouter>);
    const signInLinks = screen.getAllByRole('link', { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
    signInLinks.forEach(link => expect(link).toHaveAttribute('href', '/login'));
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/signup');
  });

  it('shows Open console when signed in', () => {
    useSession.mockReturnValue({
      session: { access_token: 't' },
      user: { id: 'u' },
      loading: false,
      emailVerified: true,
    });
    render(<MemoryRouter><Landing /></MemoryRouter>);
    const consoleLinks = screen.getAllByRole('link', { name: /open console/i });
    expect(consoleLinks.length).toBeGreaterThanOrEqual(1);
    consoleLinks.forEach(link => expect(link).toHaveAttribute('href', '/app/dashboard'));
  });

  it('renders the value proposition copy', () => {
    useSession.mockReturnValue({ session: null, user: null, loading: false, emailVerified: false });
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByText(/frontier models forget/i)).toBeInTheDocument();
    expect(screen.getByText(/70-90%/)).toBeInTheDocument();
  });
});
