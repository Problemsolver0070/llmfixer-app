import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TierCard } from './TierCard';

const PROPS = {
  name: 'Solo',
  price: '$19.99',
  period: '/ week',
  tagline: 'A single drop-in key for one developer.',
  features: ['No artificial caps.', 'All live models.'],
  ctaLabel: 'Start trial',
  onCtaClick: vi.fn(),
};

describe('TierCard', () => {
  it('renders name, price, period, tagline, and all features', () => {
    render(<TierCard {...PROPS} />);
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('/ week')).toBeInTheDocument();
    expect(screen.getByText(/single drop-in key/i)).toBeInTheDocument();
    expect(screen.getByText('No artificial caps.')).toBeInTheDocument();
    expect(screen.getByText('All live models.')).toBeInTheDocument();
  });

  it('fires onCtaClick when the CTA is clicked', () => {
    const onCtaClick = vi.fn();
    render(<TierCard {...PROPS} onCtaClick={onCtaClick} />);
    fireEvent.click(screen.getByRole('button', { name: /start trial/i }));
    expect(onCtaClick).toHaveBeenCalledTimes(1);
  });

  it('shows the extra-seat line only when extraSeat is provided', () => {
    const { rerender } = render(<TierCard {...PROPS} />);
    expect(screen.queryByTestId('extra-seat')).not.toBeInTheDocument();
    rerender(<TierCard {...PROPS} extraSeat={{ price: '$9.99', period: ' / seat / week', minSeats: 4 }} />);
    expect(screen.getByTestId('extra-seat')).toHaveTextContent('$9.99');
    expect(screen.getByTestId('extra-seat')).toHaveTextContent('beyond 4 seats');
  });

  it('renders a quiet CTA when ctaQuiet is true', () => {
    render(<TierCard {...PROPS} ctaQuiet />);
    expect(screen.getByRole('button', { name: /start trial/i })).toHaveClass('pricing-tier-cta-quiet');
  });
});
