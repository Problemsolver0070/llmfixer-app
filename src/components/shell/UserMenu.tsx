import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'transparent',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          padding: '6px 12px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {email}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            background: 'var(--color-bg-elev)',
            border: '1px solid var(--color-border)',
            minWidth: 160,
            zIndex: 10,
          }}
        >
          <button
            onClick={signOut}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 14px',
              background: 'transparent',
              border: 0,
              color: 'var(--color-text)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
