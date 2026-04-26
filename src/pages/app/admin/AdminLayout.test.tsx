import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { AdminLayout } from './AdminLayout';

describe('AdminLayout', () => {
  it('renders the three sub-tabs and the active marker', () => {
    render(
      <MemoryRouter initialEntries={['/app/admin/users']}>
        <Routes>
          <Route path="/app/admin/*" element={<AdminLayout />}>
            <Route path="users" element={<p>users body</p>} />
            <Route path="promos" element={<p>promos body</p>} />
            <Route path="metrics" element={<p>metrics body</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /promos/i })).toHaveAttribute('data-active', 'false');
    expect(screen.getByRole('link', { name: /users/i })).toHaveAttribute('data-active', 'true');
    expect(screen.getByText('users body')).toBeInTheDocument();
  });
});
