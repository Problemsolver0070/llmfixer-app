import type { Plan } from '@/hooks/usePlans';

export type Cadence = Plan['cadence'];

const CADENCES: { id: Cadence; label: string; save?: string }[] = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly', save: 'save 9%' },
  { id: 'quarterly', label: 'Quarterly', save: 'save 16%' },
  { id: 'annual', label: 'Annual', save: 'save 28%' },
];

export function CadenceToggle({
  cadence, onChange,
}: {
  cadence: Cadence;
  onChange: (next: Cadence) => void;
}) {
  return (
    <div className="cadence-toggle" role="tablist" aria-label="Billing cadence">
      {CADENCES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="tab"
          aria-selected={c.id === cadence}
          data-active={c.id === cadence}
          className="cadence-tab"
          onClick={() => onChange(c.id)}
        >
          {c.label}
          {c.save ? <span className="save">{c.save}</span> : null}
        </button>
      ))}
    </div>
  );
}
