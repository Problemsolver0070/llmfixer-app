import type { WorkspaceMember } from '@/hooks/useWorkspace';

export function SeatList({
  members,
  viewerRole,
  onRemove,
}: {
  members: WorkspaceMember[];
  viewerRole: 'admin' | 'member';
  onRemove?: (userId: string) => Promise<void>;
}) {
  return (
    <table className="workspace-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Output (wk)</th>
          <th>Last active</th>
          <th aria-label="actions" />
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.user_id} className={m.is_you ? 'workspace-row-you' : undefined}>
            <td>
              <span className="workspace-row-email">{m.email}</span>
              {m.is_admin ? <span className="workspace-role-pill">admin</span> : null}
              {m.is_you ? <span className="workspace-role-pill">you</span> : null}
            </td>
            <td>
              {m.output_tokens_this_week === 'private' ? (
                <span className="workspace-redacted">private</span>
              ) : (
                <span className="workspace-numeric">
                  {formatTokens(m.output_tokens_this_week)}
                </span>
              )}
            </td>
            <td>
              {m.last_active_at === 'private' ? (
                <span className="workspace-redacted">private</span>
              ) : (
                <span className="workspace-numeric">
                  {formatRelative(m.last_active_at)}
                </span>
              )}
            </td>
            <td>
              {viewerRole === 'admin' && !m.is_admin && onRemove ? (
                <button
                  type="button"
                  className="workspace-row-action"
                  onClick={() => {
                    void onRemove(m.user_id);
                  }}
                >
                  Remove
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatTokens(n: number): string {
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
