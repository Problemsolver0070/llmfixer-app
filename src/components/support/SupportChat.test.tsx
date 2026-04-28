import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useSupportThreads', () => ({
  useSupportThreads: vi.fn(),
}));

import { useSupportThreads } from '@/hooks/useSupportThreads';
import { SupportChat } from './SupportChat';

describe('SupportChat shell (Phase 3)', () => {
  it('shows empty-state copy when there are no threads', () => {
    (useSupportThreads as ReturnType<typeof vi.fn>).mockReturnValue({
      threads: [], loading: false, error: null,
      create: vi.fn(), rename: vi.fn(), archive: vi.fn(), remove: vi.fn(), refetch: vi.fn(),
    });
    render(<SupportChat />);
    expect(screen.getByText(/ask anything about the fixer/i)).toBeInTheDocument();
  });

  it('renders the sidebar with threads when available', () => {
    (useSupportThreads as ReturnType<typeof vi.fn>).mockReturnValue({
      threads: [{ id: 't1', title: 'How to install', archived: false, created_at: '2026-04-29T10:00:00Z', updated_at: '2026-04-29T10:00:00Z' }],
      loading: false, error: null,
      create: vi.fn(), rename: vi.fn(), archive: vi.fn(), remove: vi.fn(), refetch: vi.fn(),
    });
    render(<SupportChat />);
    expect(screen.getByText('How to install')).toBeInTheDocument();
  });

  it('shows error state when load fails', () => {
    (useSupportThreads as ReturnType<typeof vi.fn>).mockReturnValue({
      threads: [], loading: false, error: new Error('boom'),
      create: vi.fn(), rename: vi.fn(), archive: vi.fn(), remove: vi.fn(), refetch: vi.fn(),
    });
    render(<SupportChat />);
    expect(screen.getByText(/couldn't load conversations/i)).toBeInTheDocument();
  });
});
