import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="MRR" value="$5,997.00" />);
    expect(screen.getByText('MRR')).toBeInTheDocument();
    expect(screen.getByText('$5,997.00')).toBeInTheDocument();
  });

  it('renders subtext when provided', () => {
    render(<StatCard label="Active subs" value={30} subtext="8 trial / 4 comped" />);
    expect(screen.getByText('8 trial / 4 comped')).toBeInTheDocument();
  });

  it('omits subtext when not provided', () => {
    const { container } = render(<StatCard label="DAU" value={42} />);
    // value + label = 2 paragraphs only.
    expect(container.querySelectorAll('p').length).toBe(2);
  });

  it('applies the danger accent color via inline style', () => {
    render(<StatCard label="Churn" value="3.2%" accent="danger" />);
    const value = screen.getByText('3.2%');
    expect(value.getAttribute('style')).toContain('var(--color-danger)');
  });

  it('accepts ReactNode for value and subtext', () => {
    render(
      <StatCard
        label="Engagement"
        value={<span data-testid="value-span">22</span>}
        subtext={<span data-testid="sub-span">/ 80 / 180</span>}
      />,
    );
    expect(screen.getByTestId('value-span')).toBeInTheDocument();
    expect(screen.getByTestId('sub-span')).toBeInTheDocument();
  });
});
