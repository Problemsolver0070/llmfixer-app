import { Card } from '@/components/ui/Card';
import { CreatePromoForm } from '@/components/forms/CreatePromoForm';
import { useAdminPromos } from '@/hooks/useAdminPromos';

export default function Promos() {
  const { promos, loading, create, toggleActive, remove } = useAdminPromos();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card>
        <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 16px' }}>Create promo</h2>
        <CreatePromoForm onCreate={create} />
      </Card>

      <Card style={{ padding: 0 }}>
        <h2 style={{ fontSize: 14, fontWeight: 400, margin: 0, padding: '18px 22px', borderBottom: '1px solid var(--color-border)' }}>
          All promos
        </h2>
        {loading ? (
          <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>Loading...</p>
        ) : promos.length === 0 ? (
          <p style={{ padding: 22, color: 'var(--color-text-dim)' }}>No promos yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Code', 'Type', 'Amount', 'Max', 'Expires', 'Active', ''].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id}>
                  <td style={td}>{p.code}</td>
                  <td style={td}>{p.type}</td>
                  <td style={td}>{p.amount_int}</td>
                  <td style={td}>{p.max_redemptions ?? '∞'}</td>
                  <td style={td}>{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'never'}</td>
                  <td style={td}>
                    <button
                      onClick={() => toggleActive(p.id, !p.active)}
                      style={{ background: 'transparent', border: 0, color: p.active ? 'var(--color-success)' : 'var(--color-text-dim)', cursor: 'pointer', fontSize: 12 }}
                    >
                      {p.active ? 'on' : 'off'}
                    </button>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => { if (confirm(`Delete ${p.code}?`)) remove(p.id); }}
                      style={{ background: 'transparent', border: 0, color: 'var(--color-danger)', cursor: 'pointer', fontSize: 12 }}
                    >
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '0.18em',
  color: 'var(--color-text-dim)',
  textTransform: 'uppercase',
  padding: '14px 18px',
  borderBottom: '1px solid var(--color-border)',
};
const td: React.CSSProperties = {
  padding: '12px 18px',
  borderBottom: '1px solid var(--color-border)',
  fontSize: 13,
};
