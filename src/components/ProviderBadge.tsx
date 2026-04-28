import type { CSSProperties } from 'react';

type ProviderConfig = { label: string; tint: string; fg: string };

const KNOWN: Record<string, ProviderConfig> = {
  anthropic: { label: 'Anthropic', tint: 'var(--color-accent, #D4A853)', fg: 'var(--color-bg, #1B2030)' },
  openai: { label: 'OpenAI', tint: 'var(--color-success, #6BB892)', fg: 'var(--color-bg, #1B2030)' },
  gemini: { label: 'Google Gemini', tint: 'var(--color-link, #7AA8E8)', fg: 'var(--color-bg, #1B2030)' },
  xai: { label: 'xAI Grok', tint: 'var(--color-text-dim, #9099B0)', fg: 'var(--color-bg, #1B2030)' },
};

export function ProviderBadge({ provider }: { provider: string }) {
  const known = KNOWN[provider];
  const label = known?.label ?? provider;
  const style: CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 11,
    borderRadius: 4,
    background: known?.tint ?? 'var(--color-text-dim, #9099B0)',
    color: known?.fg ?? 'var(--color-bg, #1B2030)',
    letterSpacing: 0.2,
    fontWeight: 500,
  };
  return (
    <span style={style} aria-label={`Provider: ${label}`}>
      {label}
    </span>
  );
}
