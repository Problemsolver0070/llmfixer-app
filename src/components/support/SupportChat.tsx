import { useState } from 'react';
import { useSupportMessages } from '@/hooks/useSupportMessages';
import { useStreamMessage } from '@/hooks/useStreamMessage';
import { useSupportThreads } from '@/hooks/useSupportThreads';
import { useUploadAttachment } from '@/hooks/useUploadAttachment';
import type { AttachmentRef } from '@/hooks/useUploadAttachment';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { ThreadSidebar } from './ThreadSidebar';

export function SupportChat() {
  const {
    threads,
    loading: threadsLoading,
    error: threadsError,
    create,
    rename,
    archive,
    remove,
  } = useSupportThreads();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState<File[]>([]);
  const upload = useUploadAttachment();
  const { messages, append } = useSupportMessages(activeId);
  const stream = useStreamMessage(activeId ?? '');

  // Auto-select most recent thread on first load. Setting state during render
  // is safe here because it converges after one extra render and the value is
  // derived from the threads list directly.
  if (!activeId && threads.length > 0) {
    setActiveId(threads[0].id);
  }

  if (threadsError) {
    return (
      <div className="support-chat-error">
        Couldn't load conversations. Please refresh.
      </div>
    );
  }

  async function handleSend(content: string) {
    let targetThreadId = activeId;
    if (!targetThreadId) {
      const t = await create();
      targetThreadId = t.id;
      setActiveId(targetThreadId);
    }

    const refs: AttachmentRef[] = [];
    for (const f of pending) {
      const r = await upload.upload({ threadId: targetThreadId, file: f });
      refs.push(r);
    }
    setPending([]);

    append({
      id: `local-${Date.now()}`,
      thread_id: targetThreadId,
      role: 'user',
      content,
      attachments: refs,
      truncated: false,
      created_at: new Date().toISOString(),
    });
    void stream.send(content, refs);
  }

  const empty = !threadsLoading && threads.length === 0;
  const showEmptyHero = empty && messages.length === 0 && !stream.streamingMessage;

  return (
    <div className="support-chat">
      <button
        type="button"
        onClick={() => setDrawerOpen((o) => !o)}
        aria-label="Toggle threads sidebar"
        className="support-chat-drawer-toggle"
      >
        [ THREADS ]
      </button>
      <div
        className="support-chat-sidebar-wrapper"
        data-open={drawerOpen ? 'true' : 'false'}
      >
        <ThreadSidebar
          threads={threads}
          activeId={activeId}
          loading={threadsLoading}
          onSelect={(id) => {
            setActiveId(id);
            setDrawerOpen(false);
          }}
          onCreate={async () => {
            const t = await create();
            setActiveId(t.id);
            setDrawerOpen(false);
          }}
          onRename={(id, title) => {
            void rename(id, title);
          }}
          onArchive={(id) => {
            void archive(id);
            if (activeId === id) setActiveId(null);
          }}
          onDelete={(id) => {
            void remove(id);
            if (activeId === id) setActiveId(null);
          }}
        />
      </div>
      <main className="support-chat-main">
        {showEmptyHero ? (
          <div className="support-chat-empty">
            <div className="support-chat-empty-inner">
              <h2 className="support-chat-empty-hero">Ask anything.</h2>
              <p className="support-chat-empty-sub">
                Install, billing, account, errors. Drop in a screenshot or log
                if it helps.
              </p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            streaming={stream.streamingMessage}
          />
        )}
        <MessageInput
          onSend={handleSend}
          streaming={stream.streamingMessage?.status === 'streaming'}
          onStop={stream.cancel}
          attachments={pending}
          onAttach={(f) => setPending((p) => [...p, f])}
          onRemoveAttachment={(f) => setPending((p) => p.filter((x) => x !== f))}
        />
      </main>
    </div>
  );
}
