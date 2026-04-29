import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { SupportMessage } from '@/hooks/useSupportMessages';
import { MarkdownMessage } from './MarkdownMessage';

type Streaming = {
  id: string;
  text: string;
  status: 'streaming' | 'complete' | 'cancelled' | 'error';
  errorMessage?: string;
  errorType?: string;
};

type Props = {
  messages: SupportMessage[];
  streaming: Streaming | null;
  onRetry?: () => void;
};

function Bubble({
  role,
  children,
  tag,
}: {
  role: 'user' | 'assistant';
  children: ReactNode;
  tag?: string;
}) {
  const isUser = role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBlock: 6,
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          borderRadius: 8,
          background: isUser ? 'var(--color-accent)' : 'var(--color-bg-rail)',
          color: isUser ? 'var(--color-bg)' : 'var(--color-text)',
          fontSize: 13,
          whiteSpace: isUser ? 'pre-wrap' : 'normal',
        }}
      >
        {children}
        {tag && (
          <span
            style={{
              display: 'inline-block',
              marginInlineStart: 8,
              fontSize: 10,
              color: 'var(--color-text-dim)',
            }}
          >
            ({tag})
          </span>
        )}
      </div>
    </div>
  );
}

export function MessageList({ messages, streaming, onRetry }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, streaming?.text, streaming?.status]);

  return (
    <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
      {messages.map((m) => (
        <Bubble key={m.id} role={m.role} tag={m.truncated ? 'stopped' : undefined}>
          {m.role === 'assistant' ? (
            <MarkdownMessage>{m.content}</MarkdownMessage>
          ) : (
            m.content
          )}
        </Bubble>
      ))}
      {streaming && (
        <>
          {streaming.status === 'error' ? (
            <Bubble role="assistant">
              <span style={{ color: 'var(--color-danger)' }}>
                I couldn't reach the model
                {streaming.errorMessage ? `: ${streaming.errorMessage}` : ''}.
              </span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  style={{
                    marginInlineStart: 8,
                    fontSize: 12,
                    padding: '2px 8px',
                    cursor: 'pointer',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    background: 'transparent',
                    color: 'var(--color-text)',
                  }}
                >
                  Retry
                </button>
              )}
            </Bubble>
          ) : (
            <Bubble
              role="assistant"
              tag={streaming.status === 'cancelled' ? 'stopped' : undefined}
            >
              {streaming.status === 'streaming' ? (
                <>
                  {streaming.text}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      marginInlineStart: 2,
                      animation: 'support-cursor 1s steps(2) infinite',
                    }}
                    aria-hidden="true"
                  >
                    {'▍'}
                  </span>
                </>
              ) : (
                <MarkdownMessage>{streaming.text}</MarkdownMessage>
              )}
            </Bubble>
          )}
        </>
      )}
    </div>
  );
}
