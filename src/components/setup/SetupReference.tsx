import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { useKeys } from '@/hooks/useKeys';
import { tabs, snippet, type TabId } from '@/pages/app/setup-snippets';

export function SetupReference() {
  const { keys, loading } = useKeys();
  const active = keys.filter((k) => k.status === 'active');
  const [tab, setTab] = useState<TabId>('openai');
  const [keyId, setKeyId] = useState<string | null>(null);

  if (loading) {
    return (
      <section style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
        <p style={{ color: 'var(--color-text-dim)' }}>Loading...</p>
      </section>
    );
  }

  if (active.length === 0) {
    return (
      <section style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
        <Card>
          <h1 style={{ fontSize: 22, fontWeight: 300, margin: 0 }}>Setup</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-dim)', margin: '8px 0 14px' }}>
            Generate your first key, then come back here for code snippets.
          </p>
          <Link to="/app/keys" style={{ color: 'var(--color-accent-bright)' }}>
            Go to keys
          </Link>
        </Card>
      </section>
    );
  }

  const selected = active.find((k) => k.id === keyId) ?? active[0];
  const placeholderKey = `${selected.key_prefix}...`;

  return (
    <section style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <header>
          <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Setup</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
            Drop one of these into your codebase. Replace the placeholder with the key you saved at creation time.
          </p>
        </header>

        <Card>
          {active.length > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Use key:</span>
              <select
                value={selected.id}
                onChange={(e) => setKeyId(e.target.value)}
                style={{
                  background: 'var(--color-bg-rail)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                  padding: '4px 8px',
                  fontSize: 12,
                }}
              >
                {active.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label ?? k.key_prefix}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: 'transparent',
                  color: tab === t.id ? 'var(--color-text)' : 'var(--color-text-dim)',
                  border: 0,
                  borderBottom: tab === t.id ? '1px solid var(--color-accent)' : '1px solid transparent',
                  padding: '6px 4px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <pre
            style={{
              background: 'var(--color-bg-rail)',
              color: 'var(--color-text)',
              padding: 16,
              fontSize: 12,
              overflowX: 'auto',
              border: '1px solid var(--color-border)',
              margin: 0,
            }}
          >
            <code>{snippet(tab, placeholderKey)}</code>
          </pre>
        </Card>

        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 8px' }}>Available models</h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }}>
            Hit <code>GET /v1/models</code> for the live list. Today we proxy Anthropic models via Microsoft AI Foundry; OpenAI, Google Gemini, and xAI Grok are on the roadmap.{' '}
            <Link to="/app/models" style={{ color: 'var(--color-accent-bright)' }}>
              See full catalog
            </Link>
            .
          </p>
        </Card>

        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 400, margin: '0 0 8px' }}>Endpoints</h2>
          <ul style={{ fontSize: 12, color: 'var(--color-text-dim)', paddingLeft: 16, margin: 0, lineHeight: 1.7 }}>
            <li><code>POST /v1/chat/completions</code> (OpenAI-compatible)</li>
            <li><code>POST /v1/messages</code> (Anthropic-compatible)</li>
            <li><code>GET /v1/models</code></li>
          </ul>
        </Card>
      </div>
    </section>
  );
}
