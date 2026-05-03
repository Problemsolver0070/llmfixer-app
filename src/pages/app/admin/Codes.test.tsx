import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/admin/MintCompCodeForm', () => ({
  MintCompCodeForm: () => <div data-testid="mint-form">mint form</div>,
}));
vi.mock('@/components/admin/CompCodesList', () => ({
  CompCodesList: () => <div data-testid="codes-list">codes list</div>,
}));
vi.mock('@/components/admin/MintDiscountCodeForm', () => ({
  MintDiscountCodeForm: () => (
    <div data-testid="mint-discount-form">mint discount form</div>
  ),
}));
vi.mock('@/components/admin/DiscountCodesList', () => ({
  DiscountCodesList: () => (
    <div data-testid="discount-codes-list">discount codes list</div>
  ),
}));

import Codes from './Codes';

describe('Codes admin page', () => {
  it('shows the Paid usage tab active by default with the mint form and list', () => {
    render(<Codes />);
    expect(screen.getByRole('tab', { name: /paid usage/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /discount/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByTestId('mint-form')).toBeInTheDocument();
    expect(screen.getByTestId('codes-list')).toBeInTheDocument();
    expect(screen.queryByTestId('mint-discount-form')).not.toBeInTheDocument();
  });

  it('switches to the Discount tab and renders the discount mint form + list', async () => {
    render(<Codes />);
    await userEvent.click(screen.getByRole('tab', { name: /discount/i }));
    expect(screen.queryByTestId('mint-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('codes-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('mint-discount-form')).toBeInTheDocument();
    expect(screen.getByTestId('discount-codes-list')).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
