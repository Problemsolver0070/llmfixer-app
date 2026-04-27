import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}}><p>inside</p></Modal>);
    expect(screen.queryByText('inside')).not.toBeInTheDocument();
  });

  it('renders content when open', () => {
    render(<Modal open onClose={() => {}}><p>inside</p></Modal>);
    expect(screen.getByText('inside')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}><p>x</p></Modal>);
    await userEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', async () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose}><p>x</p></Modal>);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('does not re-bind the Escape listener when only onClose changes', async () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();
    const { rerender } = render(<Modal open onClose={onCloseA}><p>x</p></Modal>);
    const addCallsAfterMount = addSpy.mock.calls.filter((c) => c[0] === 'keydown').length;
    const removeCallsAfterMount = removeSpy.mock.calls.filter((c) => c[0] === 'keydown').length;
    rerender(<Modal open onClose={onCloseB}><p>x</p></Modal>);
    const addCallsAfterRerender = addSpy.mock.calls.filter((c) => c[0] === 'keydown').length;
    const removeCallsAfterRerender = removeSpy.mock.calls.filter((c) => c[0] === 'keydown').length;
    expect(addCallsAfterRerender).toBe(addCallsAfterMount);
    expect(removeCallsAfterRerender).toBe(removeCallsAfterMount);
    // The latest onClose is invoked when Escape fires.
    await userEvent.keyboard('{Escape}');
    expect(onCloseA).not.toHaveBeenCalled();
    expect(onCloseB).toHaveBeenCalled();
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
