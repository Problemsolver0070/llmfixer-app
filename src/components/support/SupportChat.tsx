import { useState } from 'react';
import { useSupportThreads } from '@/hooks/useSupportThreads';
import { ThreadSidebar } from './ThreadSidebar';

export function SupportChat() {
  const { threads, loading, error, create, rename, archive, remove } = useSupportThreads();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-select most recent on first load.
  if (!activeId && threads.length > 0) {
    setActiveId(threads[0].id);
  }

  if (error) {
    return (
      <div style={{ padding: 16, color: 'var(--color-text-dim)' }}>
        Couldn't load conversations. Please refresh.
      </div>
    );
  }

  const empty = !loading && threads.length === 0;

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setDrawerOpen((o) => !o)}
        aria-label="Toggle threads sidebar"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          background: 'var(--color-bg-rail)',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 14,
          cursor: 'pointer',
          color: 'var(--color-text)',
          zIndex: 4,
        }}
        className="support-chat-drawer-toggle"
      >
        ☰
      </button>
      <div
        className="support-chat-sidebar-wrapper"
        data-open={drawerOpen ? 'true' : 'false'}
      >
        <ThreadSidebar
          threads={threads}
          activeId={activeId}
          loading={loading}
          onSelect={(id) => { setActiveId(id); setDrawerOpen(false); }}
          onCreate={async () => { const t = await create(); setActiveId(t.id); setDrawerOpen(false); }}
          onRename={(id, title) => { void rename(id, title); }}
          onArchive={(id) => { void archive(id); if (activeId === id) setActiveId(null); }}
          onDelete={(id) => { void remove(id); if (activeId === id) setActiveId(null); }}
        />
      </div>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {empty ? (
          <div style={{ padding: 24, color: 'var(--color-text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center' }}>
            <div>
              <h2 style={{ fontSize: 16, marginBottom: 8 }}>Ask anything about The Fixer</h2>
              <p style={{ fontSize: 13 }}>Install, billing, account, errors. Drop in a screenshot or log if it helps.</p>
            </div>
          </div>
        ) : activeId ? (
          <div style={{ padding: 16, color: 'var(--color-text-dim)' }}>Selected thread: {activeId} (chat UI in Phase 4)</div>
        ) : (
          <div style={{ padding: 16, color: 'var(--color-text-dim)' }}>Select a conversation or start a new one.</div>
        )}
      </main>
    </div>
  );
}
