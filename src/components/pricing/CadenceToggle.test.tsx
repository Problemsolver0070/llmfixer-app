import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CadenceToggle } from './CadenceToggle';

describe('CadenceToggle', () => {
  it('renders all 4 cadence tabs', () => {
    render(<CadenceToggle cadence="weekly" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /weekly/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /monthly/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /quarterly/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /annual/i })).toBeInTheDocument();
  });

  it('marks the active cadence', () => {
    render(<CadenceToggle cadence="monthly" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: /monthly/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /weekly/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('fires onChange when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<CadenceToggle cadence="weekly" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /annual/i }));
    expect(onChange).toHaveBeenCalledWith('annual');
  });
});
