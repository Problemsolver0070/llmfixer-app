import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export function SignUpForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPwError(null);
    if (password.length < 8) {
      setPwError('Use at least 8 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/verify-email');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        hint="At least 8 characters."
        error={pwError ?? undefined}
        required
      />
      {error && (
        <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 12, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} loadingLabel="Creating...">
        Create account
      </Button>
      <p
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--color-text-dim)',
          marginTop: 18,
        }}
      >
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--color-link)' }}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
