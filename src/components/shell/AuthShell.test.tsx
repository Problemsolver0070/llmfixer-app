import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AuthShell } from './AuthShell';

describe('AuthShell', () => {
  it('renders the form on the left and the brand panel on the right', () => {
    render(
      <AuthShell title="Sign in" subtitle="to your console">
        <p data-testid="form-content">form goes here</p>
      </AuthShell>,
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('to your console')).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
    expect(screen.getByText(/Frontier models forget/i)).toBeInTheDocument();
  });

  it('shows the brand mark twice (form side + panel side)', () => {
    render(<AuthShell title="t" subtitle="s"><span /></AuthShell>);
    expect(screen.getAllByText('The Fixer')).toHaveLength(2);
  });
});
