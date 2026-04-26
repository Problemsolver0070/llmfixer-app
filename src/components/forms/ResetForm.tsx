import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function ResetForm() {
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (pw !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast.success('Password updated. Sign in with the new password.');
    navigate('/login');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={pw}
        onChange={(e) => setPw(e.currentTarget.value)}
        required
      />
      <Input
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.currentTarget.value)}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Saving...">
        Set password
      </Button>
    </form>
  );
}
