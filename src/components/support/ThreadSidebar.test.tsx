import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThreadSidebar } from './ThreadSidebar';

const baseProps = {
  threads: [
    { id: 't1', title: 'How to install', archived: false, created_at: '2026-04-29T10:00:00Z', updated_at: '2026-04-29T10:00:00Z' },
    { id: 't2', title: 'Billing question', archived: false, created_at: '2026-04-29T09:00:00Z', updated_at: '2026-04-29T09:00:00Z' },
  ],
  activeId: 't1',
  loading: false,
  onSelect: vi.fn(),
  onCreate: vi.fn(),
  onRename: vi.fn(),
  onArchive: vi.fn(),
  onDelete: vi.fn(),
};

describe('ThreadSidebar', () => {
  it('renders threads', () => {
    render(<ThreadSidebar {...baseProps} />);
    expect(screen.getByText('How to install')).toBeInTheDocument();
    expect(screen.getByText('Billing question')).toBeInTheDocument();
  });

  it('marks the active thread', () => {
    render(<ThreadSidebar {...baseProps} />);
    const active = screen.getByText('How to install').closest('[data-active]');
    expect(active).toHaveAttribute('data-active', 'true');
  });

  it('fires onCreate when New chat is clicked', async () => {
    const onCreate = vi.fn();
    render(<ThreadSidebar {...baseProps} onCreate={onCreate} />);
    await userEvent.click(screen.getByRole('button', { name: /new chat/i }));
    expect(onCreate).toHaveBeenCalled();
  });

  it('fires onSelect when a thread row is clicked', async () => {
    const onSelect = vi.fn();
    render(<ThreadSidebar {...baseProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Billing question'));
    expect(onSelect).toHaveBeenCalledWith('t2');
  });

  it('shows the kebab menu and fires rename', async () => {
    const onRename = vi.fn();
    window.prompt = vi.fn().mockReturnValue('Renamed');
    render(<ThreadSidebar {...baseProps} onRename={onRename} />);
    await userEvent.hover(screen.getByText('How to install'));
    await userEvent.click(screen.getByRole('button', { name: /thread actions for how to install/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /rename/i }));
    expect(onRename).toHaveBeenCalledWith('t1', 'Renamed');
  });
});
