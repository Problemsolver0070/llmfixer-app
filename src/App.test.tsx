import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('test environment', () => {
  it('renders DOM and matches jest-dom matchers', () => {
    render(<p data-testid="hello">hello world</p>);
    expect(screen.getByTestId('hello')).toHaveTextContent('hello world');
  });
});
