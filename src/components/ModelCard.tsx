import { toast } from 'sonner';
import type { ModelEntry } from '@/hooks/useModels';
import { ProviderBadge } from './ProviderBadge';

export function ModelCard({ entry }: { entry: ModelEntry }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(entry.id);
      toast.success('Model ID copied');
    } catch {
      toast.success('Copy failed; please copy manually');
    }
  }

  return (
    <article
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: 16,
        background: 'var(--color-bg-rail)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <ProviderBadge provider={entry.provider} />
        <h3 style={{ fontSize: 15, margin: 0, fontWeight: 500, color: 'var(--color-text)' }}>
          {entry.display_name}
        </h3>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <code
          style={{
            fontSize: 12,
            padding: '4px 8px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text)',
          }}
        >
          {entry.id}
        </code>
        <button
          type="button"
          aria-label={`Copy model ID ${entry.id}`}
          onClick={copy}
          style={{
            fontSize: 12,
            padding: '4px 10px',
            cursor: 'pointer',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            color: 'var(--color-text)',
          }}
        >
          Copy
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0, lineHeight: 1.5 }}>
        {entry.description}
      </p>
    </article>
  );
}
