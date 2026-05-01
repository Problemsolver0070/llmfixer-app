import type { PendingInvite } from '@/hooks/useWorkspace';

export function PendingInvitesList({
  invites,
  onRefund,
}: {
  invites: PendingInvite[];
  onRefund: (token: string) => Promise<void>;
}) {
  return (
    <table className="workspace-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Sent</th>
          <th>Expires</th>
          <th aria-label="actions" />
        </tr>
      </thead>
      <tbody>
        {invites.map((inv) => (
          <tr key={inv.token}>
            <td>
              <span className="workspace-row-email">{inv.email}</span>
              <span className="workspace-pending-pill">pending</span>
            </td>
            <td>
              <span className="workspace-numeric">{formatSent(inv.sent_at)}</span>
            </td>
            <td>
              <span className="workspace-numeric">{formatExpires(inv.expires_at)}</span>
            </td>
            <td>
              {inv.refundable ? (
                <button
                  type="button"
                  className="workspace-row-action"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Refund this seat? ${inv.email} will not be able to accept after.`,
                      )
                    ) {
                      void onRefund(inv.token);
                    }
                  }}
                >
                  Refund seat
                </button>
              ) : (
                <span className="workspace-redacted">past refund window</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatSent(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  const diffHr = Math.floor(diffSec / 3600);
  if (diffHr < 1) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  const days = Math.floor(diffHr / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatExpires(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
