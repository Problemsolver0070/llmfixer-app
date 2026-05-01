import type { ReactNode } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { InviteForm } from '@/components/workspace/InviteForm';
import { SeatList } from '@/components/workspace/SeatList';
import { PendingInvitesList } from '@/components/workspace/PendingInvitesList';

export default function Workspace(): ReactNode {
  const { workspace, loading, error, invite, refundInvite, removeSeat, leave } =
    useWorkspace();

  if (loading) {
    return <div className="workspace-loading">Loading...</div>;
  }
  if (error) {
    return (
      <div className="workspace-error" role="alert">
        Error: {error}
      </div>
    );
  }
  if (!workspace) return null;

  const {
    viewer_role: role,
    admin_email,
    plan_id,
    seat_count,
    renews_at,
    extra_seat_price_display,
    members,
    pending_invites,
  } = workspace;

  const isEmpty =
    role === 'admin' && members.length === 1 && pending_invites.length === 0;

  async function onLeave(): Promise<void> {
    if (
      window.confirm(
        'Leave this workspace? You will lose pool access immediately.',
      )
    ) {
      await leave();
    }
  }

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <h1 className="workspace-title">
          {role === 'admin' ? 'Workspace' : `${admin_email}'s workspace`}
        </h1>
        {role === 'admin' ? (
          <p className="workspace-meta">
            {plan_id} · renews {formatDate(renews_at)} · {seat_count} included
            {' · '}
            {extra_seat_price_display}
          </p>
        ) : (
          <p className="workspace-meta">
            You're a member of {admin_email}'s workspace
          </p>
        )}
      </header>

      {role === 'admin' ? (
        <section className="workspace-section">
          <div className="workspace-section-label">Invite teammate</div>
          <InviteForm onInvite={invite} />
          <p className="workspace-hint">
            Next seat will charge {extra_seat_price_display} prorated for the
            rest of this week. Refundable if they don't accept.
          </p>
        </section>
      ) : null}

      <section className="workspace-section">
        <div className="workspace-section-label">Members ({members.length})</div>
        <SeatList
          members={members}
          viewerRole={role}
          onRemove={role === 'admin' ? removeSeat : undefined}
        />
      </section>

      {role === 'admin' && pending_invites.length > 0 ? (
        <section className="workspace-section">
          <div className="workspace-section-label">
            Pending invites ({pending_invites.length})
          </div>
          <PendingInvitesList invites={pending_invites} onRefund={refundInvite} />
        </section>
      ) : null}

      {role === 'member' ? (
        <section className="workspace-section">
          <button
            type="button"
            className="workspace-leave"
            onClick={() => {
              void onLeave();
            }}
          >
            Leave workspace
          </button>
        </section>
      ) : null}

      {isEmpty ? (
        <section className="workspace-empty">
          <p>
            Your plan includes {seat_count} seats. You're using one as the admin;
            the others are free for your team.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
