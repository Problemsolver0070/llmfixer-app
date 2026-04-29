import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import type { AttachmentRef } from './useUploadAttachment';

type Status = 'idle' | 'streaming' | 'complete' | 'cancelled' | 'error';

export type StreamingState = {
  id: string;
  text: string;
  status: Status;
  errorMessage?: string;
  errorType?: string;
};

const SSE_PREFIX = 'data: ';

function parseEvent(line: string): unknown | null {
  if (!line.startsWith(SSE_PREFIX)) return null;
  try {
    return JSON.parse(line.slice(SSE_PREFIX.length));
  } catch {
    return null;
  }
}

async function getJwt(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

export function useStreamMessage(threadId: string) {
  const [streamingMessage, setStreamingMessage] = useState<StreamingState | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track the assistant_message_id in a ref so cancel() always sees the latest
  // value even if React has not yet flushed the state update.
  const assistantIdRef = useRef<string>('');

  const send = useCallback(async (content: string, attachments: AttachmentRef[]) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    assistantIdRef.current = '';

    setStreamingMessage({ id: '', text: '', status: 'streaming' });

    let res: Response;
    try {
      const token = await getJwt();
      res = await fetch(`${env.apiBase}/v1/support/threads/${threadId}/messages`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ content, attachments }),
      });
    } catch (e) {
      setStreamingMessage((prev) => ({
        id: prev?.id ?? '',
        text: prev?.text ?? '',
        status: 'error',
        errorMessage: e instanceof Error ? e.message : String(e),
      }));
      return;
    }

    if (!res.ok || !res.body) {
      setStreamingMessage((prev) => ({
        id: prev?.id ?? '',
        text: prev?.text ?? '',
        status: 'error',
        errorMessage: `HTTP ${res.status}`,
      }));
      return;
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let acc = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        let idx = buffer.indexOf('\n\n');
        while (idx !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          const ev = parseEvent(line);
          if (ev && typeof ev === 'object') {
            const e = ev as { type: string; [k: string]: unknown };
            if (e.type === 'started') {
              const id = String(e.message_id ?? '');
              assistantIdRef.current = id;
              setStreamingMessage({ id, text: '', status: 'streaming' });
            } else if (e.type === 'delta') {
              acc += String(e.text ?? '');
              setStreamingMessage({ id: assistantIdRef.current, text: acc, status: 'streaming' });
            } else if (e.type === 'complete') {
              setStreamingMessage({ id: assistantIdRef.current, text: acc, status: 'complete' });
            } else if (e.type === 'cancelled') {
              setStreamingMessage({ id: assistantIdRef.current, text: acc, status: 'cancelled' });
            } else if (e.type === 'error') {
              // The wire-level discriminator is `type === 'error'`; the
              // backend-side category lives in `error_type` per the support
              // chat SSE protocol (spec section 7).
              setStreamingMessage({
                id: assistantIdRef.current,
                text: acc,
                status: 'error',
                errorMessage: typeof e.message === 'string' ? e.message : 'error',
                errorType: typeof e.error_type === 'string' ? e.error_type : undefined,
              });
            }
          }
          idx = buffer.indexOf('\n\n');
        }
      }
    } catch (e) {
      if (ctrl.signal.aborted) {
        // The cancel() path already sets status; nothing more to do.
        return;
      }
      setStreamingMessage((prev) => ({
        id: prev?.id ?? assistantIdRef.current,
        text: prev?.text ?? acc,
        status: 'error',
        errorMessage: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [threadId]);

  const cancel = useCallback(() => {
    const id = assistantIdRef.current;
    if (id) {
      // POST the assistant_message_id we received via the SSE `started` event.
      void api(`/v1/support/threads/${threadId}/messages/cancel`, {
        method: 'POST',
        body: { message_id: id },
      });
    }
    abortRef.current?.abort();
    setStreamingMessage((prev) =>
      prev ? { ...prev, status: 'cancelled' } : null,
    );
  }, [threadId]);

  const reset = useCallback(() => setStreamingMessage(null), []);

  return { streamingMessage, send, cancel, reset };
}
