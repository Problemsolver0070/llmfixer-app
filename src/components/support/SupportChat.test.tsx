import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useSupportThreads', () => ({
  useSupportThreads: vi.fn(),
}));
vi.mock('@/hooks/useSupportMessages', () => ({
  useSupportMessages: () => ({
    messages: [],
    loading: false,
    error: null,
    append: vi.fn(),
    replaceLast: vi.fn(),
  }),
}));
vi.mock('@/hooks/useStreamMessage', () => ({
  useStreamMessage: () => ({
    streamingMessage: null,
    send: vi.fn(),
    cancel: vi.fn(),
    reset: vi.fn(),
  }),
}));
vi.mock('@/hooks/useUploadAttachment', () => ({
  useUploadAttachment: () => ({ uploading: false, upload: vi.fn() }),
}));

import { useSupportThreads } from '@/hooks/useSupportThreads';
import { SupportChat } from './SupportChat';

describe('SupportChat', () => {
  it('shows empty-state copy when there are no threads', () => {
    (useSupportThreads as ReturnType<typeof vi.fn>).mockReturnValue({
      threads: [],
      loading: false,
      error: null,
      create: vi.fn(),
      rename: vi.fn(),
      archive: vi.fn(),
      remove: vi.fn(),
      refetch: vi.fn(),
    });
    render(<SupportChat />);
    expect(
      screen.getByRole('heading', { name: /ask anything\.?/i, level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/install, billing, account, errors/i),
    ).toBeInTheDocument();
  });

  it('renders the sidebar with threads when available', () => {
    (useSupportThreads as ReturnType<typeof vi.fn>).mockReturnValue({
      threads: [
        {
          id: 't1',
          title: 'How to install',
          archived: false,
          created_at: '2026-04-29T10:00:00Z',
          updated_at: '2026-04-29T10:00:00Z',
        },
      ],
      loading: false,
      error: null,
      create: vi.fn(),
      rename: vi.fn(),
      archive: vi.fn(),
      remove: vi.fn(),
      refetch: vi.fn(),
    });
    render(<SupportChat />);
    expect(screen.getByText('How to install')).toBeInTheDocument();
  });

  it('shows error state when load fails', () => {
    (useSupportThreads as ReturnType<typeof vi.fn>).mockReturnValue({
      threads: [],
      loading: false,
      error: new Error('boom'),
      create: vi.fn(),
      rename: vi.fn(),
      archive: vi.fn(),
      remove: vi.fn(),
      refetch: vi.fn(),
    });
    render(<SupportChat />);
    expect(screen.getByText(/couldn't load conversations/i)).toBeInTheDocument();
  });

  it('renders the message input when a thread is active', () => {
    (useSupportThreads as ReturnType<typeof vi.fn>).mockReturnValue({
      threads: [
        {
          id: 't1',
          title: 'How to install',
          archived: false,
          created_at: '2026-04-29T10:00:00Z',
          updated_at: '2026-04-29T10:00:00Z',
        },
      ],
      loading: false,
      error: null,
      create: vi.fn(),
      rename: vi.fn(),
      archive: vi.fn(),
      remove: vi.fn(),
      refetch: vi.fn(),
    });
    render(<SupportChat />);
    expect(
      screen.getByPlaceholderText(/ask anything\.?/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });
});
