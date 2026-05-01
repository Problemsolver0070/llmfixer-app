import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { CascadeCancelDialog } from './CascadeCancelDialog';

describe('CascadeCancelDialog', () => {
  const members = [
    { email: 'jess@acme.io' },
    { email: 'sam@acme.io' },
    { email: 'kira@acme.io' },
  ];

  it('renders all affected member emails', () => {
    render(
      <CascadeCancelDialog
        members={members}
        accessLossDate="May 28"
        action="cancel"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    members.forEach((m) =>
      expect(screen.getByText(m.email)).toBeInTheDocument(),
    );
  });

  it('shows the access-loss date for cancel mode', () => {
    render(
      <CascadeCancelDialog
        members={members}
        accessLossDate="May 28"
        action="cancel"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/on May 28/)).toBeInTheDocument();
  });

  it('shows "immediately" for downgrade mode', () => {
    render(
      <CascadeCancelDialog
        members={members}
        accessLossDate="immediately"
        action="downgrade"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/immediately/)).toBeInTheDocument();
  });

  it('calls onCancel when Keep workspace is clicked, never onConfirm', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <CascadeCancelDialog
        members={members}
        accessLossDate="May 28"
        action="cancel"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByText(/Keep workspace/i));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when destructive button is clicked', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <CascadeCancelDialog
        members={members}
        accessLossDate="May 28"
        action="cancel"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Cancel subscription/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('uses singular copy when only one member', () => {
    render(
      <CascadeCancelDialog
        members={[members[0]]}
        accessLossDate="May 28"
        action="cancel"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/access for 1 member\?/)).toBeInTheDocument();
  });

  it('renders Downgrade to Solo label when action is downgrade', () => {
    render(
      <CascadeCancelDialog
        members={members}
        accessLossDate="immediately"
        action="downgrade"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Downgrade to Solo/i }),
    ).toBeInTheDocument();
  });
});
