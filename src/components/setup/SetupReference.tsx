import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useKeys } from '@/hooks/useKeys';
import { tabs, snippet, type TabId } from '@/pages/app/setup-snippets';

export function SetupReference() {
  const { keys, loading } = useKeys();
  const active = keys.filter((k) => k.status === 'active');
  const [tab, setTab] = useState<TabId>('openai');
  const [keyId, setKeyId] = useState<string | null>(null);

  if (loading) {
    return (
      <section className="setup-reference setup-reference-loading">
        <p className="setup-reference-loading-text">{'> LOADING...'}</p>
      </section>
    );
  }

  if (active.length === 0) {
    return (
      <section className="setup-reference">
        <header className="setup-reference-header">
          <span className="section-label">
            <span className="tick">{'>'}</span> SETUP
          </span>
          <hr className="rule" />
          <h1 className="setup-hero">Wire it up.</h1>
          <p className="setup-reference-empty-copy">
            Generate your first key, then come back here for code snippets.
          </p>
        </header>
        <Link to="/app/keys" className="setup-reference-empty-cta">
          <span className="tick">{'>'}</span> GO TO KEYS
        </Link>
      </section>
    );
  }

  const selected = active.find((k) => k.id === keyId) ?? active[0];
  const placeholderKey = `${selected.key_prefix}...`;

  return (
    <section className="setup-reference">
      <header className="setup-reference-header">
        <span className="section-label">
          <span className="tick">{'>'}</span> SETUP
        </span>
        <hr className="rule" />
        <h1 className="setup-hero">Wire it up.</h1>
        <p className="setup-reference-sub">
          Drop one of these into your codebase. Replace the placeholder with the
          key you saved at creation time.
        </p>
      </header>

      <div className="setup-reference-section">
        <span className="section-label">
          <span className="tick">{'>'}</span> QUICK START
        </span>
        <hr className="rule" />

        {active.length > 1 && (
          <div className="setup-reference-key-picker">
            <span className="small-caps-mono setup-reference-key-picker-label">
              Use key
            </span>
            <select
              value={selected.id}
              onChange={(e) => setKeyId(e.target.value)}
              className="setup-reference-key-select"
            >
              {active.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label ?? k.key_prefix}
                </option>
              ))}
            </select>
          </div>
        )}

        <div role="tablist" className="setup-reference-tabs">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.id)}
                className="setup-reference-tab"
                data-active={isActive}
              >
                <span className="setup-reference-tab-prefix" aria-hidden="true">
                  {isActive ? '└─' : '  '}
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <figure className="setup-reference-snippet">
          <figcaption className="setup-reference-snippet-caption">
            <span className="tick">{'>'}</span> {tabs.find((t) => t.id === tab)?.label.toUpperCase()}
          </figcaption>
          <pre className="setup-reference-pre">
            <code>{snippet(tab, placeholderKey)}</code>
          </pre>
        </figure>
      </div>

      <div className="setup-reference-section">
        <span className="section-label">
          <span className="tick">{'>'}</span> MODELS
        </span>
        <hr className="rule" />
        <p className="setup-reference-prose">
          Hit <code className="code-id">GET /v1/models</code> for the live list.
          Today we proxy Anthropic models via Microsoft AI Foundry; OpenAI,
          Google Gemini, and xAI Grok are on the roadmap.
        </p>
        <Link to="/app/models" className="setup-reference-inline-link">
          <span className="tick">{'>'}</span> SEE FULL CATALOG
        </Link>
      </div>

      <div className="setup-reference-section">
        <span className="section-label">
          <span className="tick">{'>'}</span> ENDPOINTS
        </span>
        <hr className="rule" />
        <ul className="setup-reference-endpoints">
          <li>
            <span className="endpoint-method">POST</span>
            <code className="code-id">/v1/chat/completions</code>
            <span className="endpoint-note">(OpenAI-compatible)</span>
          </li>
          <li>
            <span className="endpoint-method">POST</span>
            <code className="code-id">/v1/messages</code>
            <span className="endpoint-note">(Anthropic-compatible)</span>
          </li>
          <li>
            <span className="endpoint-method">GET</span>
            <code className="code-id">/v1/models</code>
          </li>
        </ul>
      </div>
    </section>
  );
}
