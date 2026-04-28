import { useState } from 'react';
import type { SupportThread } from '@/hooks/useSupportThreads';

type Props = {
  threads: SupportThread[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ThreadSidebar(props: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <aside
      style={{
        width: 220,
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-bg-rail)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div style={{ padding: 12, borderBottom: '1px solid var(--color-border)' }}>
        <button
          type="button"
          onClick={props.onCreate}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--color-accent, #2b6fb4)',
            color: 'var(--color-bg)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          + New chat
        </button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, overflowY: 'auto' }}>
        {props.loading && <li style={{ padding: 12, fontSize: 12, color: 'var(--color-text-dim)' }}>Loading...</li>}
        {!props.loading && props.threads.length === 0 && (
          <li style={{ padding: 12, fontSize: 12, color: 'var(--color-text-dim)' }}>No conversations yet.</li>
        )}
        {props.threads.map((t) => {
          const active = t.id === props.activeId;
          const isMenuOpen = openMenu === t.id;
          return (
            <li
              key={t.id}
              data-active={active}
              style={{
                position: 'relative',
                padding: '8px 12px',
                background: active ? 'var(--color-bg-elev, #2a2f43)' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
              }}
              onClick={() => props.onSelect(t.id)}
              title={t.title}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
              <button
                type="button"
                aria-label={`Thread actions for ${t.title}`}
                onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : t.id); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: 14 }}
              >
                ⋮
              </button>
              {isMenuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    right: 4,
                    top: '100%',
                    background: 'var(--color-bg-elev, #2a2f43)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    padding: 4,
                    zIndex: 5,
                    minWidth: 120,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      const newTitle = window.prompt('Rename conversation', t.title);
                      if (newTitle) props.onRename(t.id, newTitle);
                      setOpenMenu(null);
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { props.onArchive(t.id); setOpenMenu(null); }}
                    style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (window.confirm(`Delete "${t.title}"? This cannot be undone.`)) {
                        props.onDelete(t.id);
                      }
                      setOpenMenu(null);
                    }}
                    style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-danger, #c4564b)' }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
