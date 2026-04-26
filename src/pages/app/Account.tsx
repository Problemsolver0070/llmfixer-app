import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ChangeEmailForm } from '@/components/forms/ChangeEmailForm';
import { ChangePasswordForm } from '@/components/forms/ChangePasswordForm';
import { DeleteAccountForm } from '@/components/forms/DeleteAccountForm';
import { useAccount } from '@/hooks/useAccount';
import { supabase } from '@/lib/supabase';

export default function Account() {
  const { data, loading } = useAccount();
  const navigate = useNavigate();
  const [emailOpen, setEmailOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [danger, setDanger] = useState(false);

  if (loading || !data) return <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>;

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Account</h1>

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Email
        </p>
        <p style={{ fontSize: 16, margin: '8px 0 14px' }}>{data.user.email}</p>
        <div style={{ display: 'flex', gap: 12, maxWidth: 320 }}>
          <Button variant="ghost" onClick={() => setEmailOpen(true)}>Change email</Button>
          <Button variant="ghost" onClick={() => setPwOpen(true)}>Change password</Button>
        </div>
      </Card>

      <Card>
        <p style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--color-text-dim)', textTransform: 'uppercase', margin: 0 }}>
          Session
        </p>
        <div style={{ marginTop: 12, maxWidth: 200 }}>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </div>
      </Card>

      <Card>
        <button
          onClick={() => setDanger((v) => !v)}
          style={{
            background: 'transparent',
            color: 'var(--color-danger)',
            border: 0,
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {danger ? 'Hide danger zone' : 'Show danger zone'}
        </button>
        {danger && (
          <div style={{ marginTop: 16 }}>
            <DeleteAccountForm />
          </div>
        )}
      </Card>

      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Change email">
        <ChangeEmailForm currentEmail={data.user.email} />
      </Modal>
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change password">
        <ChangePasswordForm />
      </Modal>
    </div>
  );
}
