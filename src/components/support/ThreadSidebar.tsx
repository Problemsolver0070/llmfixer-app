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
    <aside className="thread-sidebar">
      <div className="thread-sidebar-header">
        <button
          type="button"
          onClick={props.onCreate}
          className="thread-sidebar-new"
        >
          <span className="tick" aria-hidden="true">{'>'}</span>
          <span>NEW CHAT</span>
        </button>
      </div>
      <ul className="thread-sidebar-list">
        {props.loading && (
          <li className="thread-sidebar-empty">{'> LOADING...'}</li>
        )}
        {!props.loading && props.threads.length === 0 && (
          <li className="thread-sidebar-empty">No conversations yet.</li>
        )}
        {props.threads.map((t) => {
          const active = t.id === props.activeId;
          const isMenuOpen = openMenu === t.id;
          return (
            <li
              key={t.id}
              data-active={active}
              className="thread-sidebar-row"
              onClick={() => props.onSelect(t.id)}
              title={t.title}
            >
              <span
                className="thread-sidebar-row-tick"
                aria-hidden="true"
                data-active={active}
              >
                {active ? '>' : ' '}
              </span>
              <span className="thread-sidebar-row-title">{t.title}</span>
              <button
                type="button"
                aria-label={`Thread actions for ${t.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(isMenuOpen ? null : t.id);
                }}
                className="thread-sidebar-row-menu-trigger"
              >
                ...
              </button>
              {isMenuOpen && (
                <div
                  role="menu"
                  className="thread-sidebar-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="thread-sidebar-menu-item"
                    onClick={() => {
                      const newTitle = window.prompt(
                        'Rename conversation',
                        t.title,
                      );
                      if (newTitle) props.onRename(t.id, newTitle);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="thread-sidebar-menu-prefix" aria-hidden="true">
                      {'└─'}
                    </span>
                    <span>Rename</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="thread-sidebar-menu-item"
                    onClick={() => {
                      props.onArchive(t.id);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="thread-sidebar-menu-prefix" aria-hidden="true">
                      {'└─'}
                    </span>
                    <span>Archive</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="thread-sidebar-menu-item thread-sidebar-menu-item-danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete "${t.title}"? This cannot be undone.`,
                        )
                      ) {
                        props.onDelete(t.id);
                      }
                      setOpenMenu(null);
                    }}
                  >
                    <span className="thread-sidebar-menu-prefix" aria-hidden="true">
                      {'└─'}
                    </span>
                    <span>Delete</span>
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
