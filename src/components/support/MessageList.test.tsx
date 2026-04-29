import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessageList } from './MessageList';
import type { SupportMessage } from '@/hooks/useSupportMessages';

const messages: SupportMessage[] = [
  {
    id: 'm1',
    thread_id: 't1',
    role: 'user',
    content: 'How do I install?',
    attachments: [],
    truncated: false,
    created_at: '2026-04-29T12:00:00Z',
  },
  {
    id: 'm2',
    thread_id: 't1',
    role: 'assistant',
    content: 'Run `npm install`.',
    attachments: [],
    truncated: false,
    created_at: '2026-04-29T12:00:01Z',
  },
];

describe('MessageList', () => {
  it('renders user and assistant messages', () => {
    render(<MessageList messages={messages} streaming={null} />);
    expect(screen.getByText('How do I install?')).toBeInTheDocument();
    expect(screen.getByText('npm install')).toBeInTheDocument();
  });

  it('renders the streaming bubble while streaming', () => {
    render(
      <MessageList
        messages={messages}
        streaming={{ id: 'a1', text: 'thinking...', status: 'streaming' }}
      />,
    );
    expect(screen.getByText('thinking...')).toBeInTheDocument();
  });

  it('marks cancelled messages with a tag', () => {
    render(
      <MessageList
        messages={messages}
        streaming={{ id: 'a1', text: 'partial', status: 'cancelled' }}
      />,
    );
    expect(screen.getByText(/stopped/i)).toBeInTheDocument();
  });

  it('shows error retry when status is error', () => {
    render(
      <MessageList
        messages={messages}
        streaming={{ id: 'a1', text: '', status: 'error', errorMessage: 'boom' }}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
