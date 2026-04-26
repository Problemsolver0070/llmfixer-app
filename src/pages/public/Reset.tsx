import { AuthShell } from '@/components/shell/AuthShell';
import { ResetForm } from '@/components/forms/ResetForm';

export default function Reset() {
  return (
    <AuthShell title="Set a new password" subtitle="link verified by Supabase">
      <ResetForm />
    </AuthShell>
  );
}
