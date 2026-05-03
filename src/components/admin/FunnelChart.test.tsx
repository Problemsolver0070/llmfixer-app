import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FunnelChart } from './FunnelChart';

const stages = [
  { label: 'Signups (30d)', count: 200 },
  { label: 'Trial started (30d)', count: 140 },
  { label: 'First paid (30d)', count: 60 },
];

describe('FunnelChart', () => {
  it('renders one row per stage with counts', () => {
    render(<FunnelChart stages={stages} />);
    expect(screen.getByText('Signups (30d)')).toBeInTheDocument();
    expect(screen.getByText('Trial started (30d)')).toBeInTheDocument();
    expect(screen.getByText('First paid (30d)')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('computes conversion percentage from previous stage', () => {
    render(<FunnelChart stages={stages} />);
    // 140 / 200 = 70.0%
    expect(screen.getByText('70.0%')).toBeInTheDocument();
    // 60 / 140 = 42.857... -> 42.9%
    expect(screen.getByText('42.9%')).toBeInTheDocument();
  });

  it('does not render a conversion percentage on the first stage', () => {
    render(<FunnelChart stages={stages} />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(3);
    // First listitem should not contain any "%" text.
    expect(within(items[0]).queryByText(/%/)).toBeNull();
  });

  it('honors caller-provided conversion_pct over computed value', () => {
    render(
      <FunnelChart
        stages={[
          { label: 'A', count: 100 },
          { label: 'B', count: 50, conversion_pct: 80 },
        ]}
      />,
    );
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.queryByText('50.0%')).toBeNull();
  });

  it('renders when top stage has zero count without dividing by zero', () => {
    render(
      <FunnelChart
        stages={[
          { label: 'A', count: 0 },
          { label: 'B', count: 0 },
        ]}
      />,
    );
    // Two zeros plus no infinity / NaN showing up.
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/Infinity|NaN/)).toBeNull();
  });
});
