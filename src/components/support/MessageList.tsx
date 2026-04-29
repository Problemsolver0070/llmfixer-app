import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { SupportMessage } from '@/hooks/useSupportMessages';
import { MarkdownMessage } from './MarkdownMessage';

export type Streaming = {
  id: string;
  text: string;
  status: 'idle' | 'streaming' | 'complete' | 'cancelled' | 'error';
  errorMessage?: string;
  errorType?: string;
};

type Props = {
  messages: SupportMessage[];
  streaming: Streaming | null;
  onRetry?: () => void;
};

function MessageRow({
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
      className={isUser ? 'message-row message-row-user' : 'message-row message-row-assistant'}
    >
      <div className={isUser ? 'message-content message-content-user' : 'message-content message-content-assistant'}>
        {children}
        {tag && (
          <span className="message-tag" aria-label="message status">
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
    <div ref={ref} className="message-list">
      {messages.map((m) => (
        <MessageRow
          key={m.id}
          role={m.role}
          tag={m.truncated ? 'STOPPED' : undefined}
        >
          {m.role === 'assistant' ? (
            <MarkdownMessage>{m.content}</MarkdownMessage>
          ) : (
            m.content
          )}
        </MessageRow>
      ))}
      {streaming && streaming.status !== 'idle' && (
        <>
          {streaming.status === 'error' ? (
            <MessageRow role="assistant">
              <span className="message-error-text">
                I couldn't reach the model
                {streaming.errorMessage ? `: ${streaming.errorMessage}` : ''}.
              </span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="message-retry"
                >
                  <span className="tick" aria-hidden="true">{'>'}</span> Retry
                </button>
              )}
            </MessageRow>
          ) : (
            <MessageRow
              role="assistant"
              tag={streaming.status === 'cancelled' ? 'STOPPED' : undefined}
            >
              {streaming.status === 'streaming' ? (
                <>
                  <span className="message-streaming-text">{streaming.text}</span>
                  <span
                    className="message-cursor"
                    aria-hidden="true"
                  >
                    {'█'}
                  </span>
                </>
              ) : (
                <MarkdownMessage>{streaming.text}</MarkdownMessage>
              )}
            </MessageRow>
          )}
        </>
      )}
    </div>
  );
}
