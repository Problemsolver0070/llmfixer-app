import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type SupportMessage = {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments: Array<{ name: string; type: string; size: number; storage_path: string }>;
  truncated: boolean;
  created_at: string;
};

type Page = { messages: SupportMessage[]; next_cursor: string | null };

export function useSupportMessages(threadId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(threadId !== null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!threadId) {
      // No active thread: clear and stop loading. Setting state inside an
      // effect is unavoidable here because the threadId can transition from
      // a string back to null when the user closes a thread.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<Page>(`/v1/support/threads/${threadId}/messages`)
      .then((page) => {
        if (cancelled) return;
        // API returns newest-first within a page; reverse for oldest-first display.
        setMessages([...page.messages].reverse());
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const append = useCallback((msg: SupportMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const replaceLast = useCallback((updater: (prev: SupportMessage) => SupportMessage) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice();
      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  }, []);

  return { messages, loading, error, append, replaceLast };
}
