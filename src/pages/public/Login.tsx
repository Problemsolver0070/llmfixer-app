import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AuthShell } from '@/components/shell/AuthShell';
import { SignInForm } from '@/components/forms/SignInForm';

export default function Login() {
  const [params] = useSearchParams();
  useEffect(() => {
    if (params.get('reason') === 'expired') {
      toast.message('Session expired. Please sign in again.');
    }
  }, [params]);

  return (
    <AuthShell title="Sign in" subtitle="to your console">
      <SignInForm />
    </AuthShell>
  );
}
