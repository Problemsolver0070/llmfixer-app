import { type ReactNode, useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  // Keep the latest onClose in a ref so the keydown effect doesn't re-bind on
  // every render when the parent passes a fresh inline arrow.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      data-testid="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--color-bg-elev)',
          border: '1px solid var(--color-border)',
          minWidth: 420, maxWidth: 560, padding: 24,
        }}
      >
        {title && (
          <h2 style={{ fontSize: 16, fontWeight: 400, margin: '0 0 16px' }}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
