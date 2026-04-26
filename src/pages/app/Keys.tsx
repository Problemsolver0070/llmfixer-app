import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { CreateKeyForm } from '@/components/forms/CreateKeyForm';
import { useKeys, type ApiKey } from '@/hooks/useKeys';
import { formatDateTime } from '@/lib/format';

export default function Keys() {
  const { keys, loading, create, revoke } = useKeys();
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const active = keys.filter((k) => k.status === 'active');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>API keys</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
            {active.length} / 10 active keys
          </p>
        </div>
        <div style={{ width: 160 }}>
          <Button onClick={() => setCreateOpen(true)}>Create key</Button>
        </div>
      </header>

      {loading ? (
        <Card><p style={{ color: 'var(--color-text-dim)' }}>Loading...</p></Card>
      ) : keys.length === 0 ? (
        <Card>
          <p style={{ fontSize: 14 }}>No keys yet.</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '6px 0 16px' }}>
            Create a key to start using The Fixer.
          </p>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                {['Label', 'Prefix', 'Created', 'Last used', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.18em',
                      color: 'var(--color-text-dim)',
                      textTransform: 'uppercase',
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td style={cell}>{k.label ?? '(no label)'}</td>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {k.key_prefix}...
                  </td>
                  <td style={cell}>{formatDateTime(k.created_at)}</td>
                  <td style={cell}>{k.last_used_at ? formatDateTime(k.last_used_at) : 'never'}</td>
                  <td style={{ ...cell, color: k.status === 'active' ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                    {k.status}
                  </td>
                  <td style={{ ...cell, width: 140 }}>
                    {k.status === 'active' && (
                      <button
                        onClick={() => setRevokeTarget(k)}
                        style={{
                          background: 'transparent',
                          color: 'var(--color-danger)',
                          border: 0,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create API key">
        <CreateKeyForm onCreate={create} onDone={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="Revoke this key?"
      >
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)', marginBottom: 18 }}>
          Any integration using <code>{revokeTarget?.key_prefix}...</code> will stop working immediately.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" onClick={() => setRevokeTarget(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!revokeTarget) return;
              await revoke(revokeTarget.id);
              setRevokeTarget(null);
            }}
          >
            Confirm revoke
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: '14px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
};
