import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface WorkspaceMember {
  user_id: string;
  email: string;
  is_admin: boolean;
  is_you: boolean;
  output_tokens_this_week: number | 'private';
  last_active_at: string | 'private' | null;
}

export interface PendingInvite {
  token: string;
  email: string;
  sent_at: string;
  expires_at: string;
  refund_deadline: string;
  refundable: boolean;
}

export interface WorkspaceSummary {
  admin_email: string;
  plan_id: string;
  seat_count: number;
  renews_at: string;
  extra_seat_price_display: string;
  viewer_role: 'admin' | 'member';
  members: WorkspaceMember[];
  pending_invites: PendingInvite[];
}

interface WorkspaceResponse {
  workspace: WorkspaceSummary;
}

export interface UseWorkspaceResult {
  workspace: WorkspaceSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  invite: (email: string) => Promise<void>;
  refundInvite: (token: string) => Promise<void>;
  removeSeat: (userId: string) => Promise<void>;
  leave: () => Promise<void>;
}

export function useWorkspace(): UseWorkspaceResult {
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const body = await api<WorkspaceResponse>('/v1/workspace');
      setWorkspace(body.workspace);
      setError(null);
    } catch (e: unknown) {
      const message =
        e instanceof Error && e.message ? e.message : 'failed_to_load';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; refresh is stable (useCallback with [])
  useEffect(() => { void refresh(); }, [refresh]);

  const invite = useCallback(async (email: string) => {
    await api('/v1/workspace/invite', { method: 'POST', body: { email } });
    await refresh();
  }, [refresh]);

  const refundInvite = useCallback(async (token: string) => {
    await api(`/v1/workspace/invites/${encodeURIComponent(token)}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  const removeSeat = useCallback(async (userId: string) => {
    await api(`/v1/workspace/seats/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  const leave = useCallback(async () => {
    await api('/v1/workspace/leave', { method: 'POST' });
    await refresh();
  }, [refresh]);

  return { workspace, loading, error, refresh, invite, refundInvite, removeSeat, leave };
}
