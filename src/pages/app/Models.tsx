import { ComingSoonCard } from '@/components/ComingSoonCard';
import { ModelCard } from '@/components/ModelCard';
import { useModels } from '@/hooks/useModels';

function Skeleton() {
  return (
    <div
      data-testid="skeleton-card"
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: 16,
        background: 'var(--color-bg-rail)',
        height: 120,
        opacity: 0.5,
      }}
    />
  );
}

const grid = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
} as const;

const sectionHeading = {
  fontSize: 18,
  fontWeight: 400,
  marginBottom: 12,
  color: 'var(--color-text)',
} as const;

export function Models() {
  const { data, loading, error } = useModels();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <header>
          <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Models</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
            The model catalog available through The Fixer.
          </p>
        </header>
        <section>
          <h2 style={sectionHeading}>Available now</h2>
          <div style={grid}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} />
            ))}
          </div>
        </section>
        <section>
          <h2 style={sectionHeading}>Coming soon</h2>
          <div style={grid}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 16, color: 'var(--color-text-dim)' }}>
        Couldn't load the catalog right now. Please refresh.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <h1 style={{ fontSize: 24, fontWeight: 300, margin: 0 }}>Models</h1>
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
          The model catalog available through The Fixer.
        </p>
      </header>
      <section>
        <h2 style={sectionHeading}>Available now</h2>
        <div style={grid}>
          {data.available.map((m) => (
            <ModelCard key={m.id} entry={m} />
          ))}
        </div>
      </section>
      <section>
        <h2 style={sectionHeading}>Coming soon</h2>
        <div style={grid}>
          {data.coming_soon.map((t) => (
            <ComingSoonCard key={t.provider} teaser={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
