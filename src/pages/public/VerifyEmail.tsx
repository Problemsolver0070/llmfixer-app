import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthShell } from '@/components/shell/AuthShell';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';

export default function VerifyEmail() {
  const { session, user, loading, emailVerified } = useSession();
  const navigate = useNavigate();
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (emailVerified) return <Navigate to="/app/dashboard" replace />;

  async function resend() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email: user!.email! });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSentAt(Date.now());
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <AuthShell title="Verify your email" subtitle={`we sent a link to ${user?.email}`}>
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 18 }}>
        Click the link in your inbox. It verifies your account, then we will route you to your console.
      </p>
      {sentAt && (
        <p style={{ fontSize: 12, color: 'var(--color-success)', marginBottom: 12 }}>
          We sent a fresh link.
        </p>
      )}
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button onClick={resend} loading={busy} loadingLabel="Resending...">
        Resend verification email
      </Button>
      <p style={{ textAlign: 'center', marginTop: 18 }}>
        <button
          onClick={signOut}
          style={{ background: 'transparent', border: 0, color: 'var(--color-link)', fontSize: 11, cursor: 'pointer' }}
        >
          Use a different account
        </button>
      </p>
    </AuthShell>
  );
}
