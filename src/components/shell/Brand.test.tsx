import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Brand } from './Brand';

describe('Brand', () => {
  it('renders the brand name', () => {
    render(<Brand />);
    expect(screen.getByText('The Fixer')).toBeInTheDocument();
  });

  it('shows a gold dot before the wordmark', () => {
    render(<Brand />);
    expect(screen.getByTestId('brand-dot')).toBeInTheDocument();
  });
});
