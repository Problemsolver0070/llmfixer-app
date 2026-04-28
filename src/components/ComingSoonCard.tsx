import type { ProviderTeaser } from '@/hooks/useModels';
import { ProviderBadge } from './ProviderBadge';

export function ComingSoonCard({ teaser }: { teaser: ProviderTeaser }) {
  return (
    <article
      aria-label={`${teaser.display_name} coming soon`}
      style={{
        border: '1px dashed var(--color-border)',
        borderRadius: 8,
        padding: 16,
        background: 'var(--color-bg)',
        opacity: 0.7,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <ProviderBadge provider={teaser.provider} />
        <h3 style={{ fontSize: 15, margin: 0, fontWeight: 500, color: 'var(--color-text)' }}>
          {teaser.display_name}
        </h3>
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 3,
            background: 'var(--color-text-dim)',
            color: 'var(--color-bg)',
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Coming soon
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0, lineHeight: 1.5 }}>
        {teaser.description}
      </p>
    </article>
  );
}
