import { useEffect, useState } from 'react';
import { useAppShellWidth } from '@/components/shell/appShellWidth';
import { SetupReference } from '@/components/setup/SetupReference';
import { SupportChat } from '@/components/support/SupportChat';

const MOBILE_QUERY = '(max-width: 1023px)';

function useIsMobile(): boolean {
  // Synchronous initial state avoids a desktop-layout flash on the first
  // paint when the viewport is actually narrow. SSR / non-browser hosts
  // fall back to false (desktop), which matches the previous behavior.
  const [mobile, setMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(MOBILE_QUERY).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

export function Setup() {
  // Setup hosts a long reference column plus a wide chat surface; it gets
  // the full-width shell variant so the chat has room to breathe on
  // anything bigger than a laptop screen.
  useAppShellWidth('full');
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  return (
    <div className="setup-grid">
      <aside className="setup-grid-reference" aria-label="Setup reference">
        {isMobile ? (
          <div className="setup-reference-disclosure">
            <button
              type="button"
              className="setup-reference-disclosure-summary"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <span className="tick">{'>'}</span> Quick reference
            </button>
            {open && <SetupReference />}
          </div>
        ) : (
          <SetupReference />
        )}
      </aside>
      <section className="setup-grid-chat" aria-label="Support chat">
        <SupportChat />
      </section>
    </div>
  );
}

export default Setup;
