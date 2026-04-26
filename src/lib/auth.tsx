import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { useAccount } from '@/hooks/useAccount';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, emailVerified } = useSession();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!emailVerified) return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireAdminInner>{children}</RequireAdminInner>
    </RequireAuth>
  );
}

function RequireAdminInner({ children }: { children: ReactNode }) {
  const { data, loading } = useAccount();
  if (loading) return null;
  if (data?.user.role !== 'admin') return <Navigate to="/no-such-page" replace />;
  return <>{children}</>;
}
