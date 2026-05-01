import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatCrossLink } from "./ChatCrossLink";

vi.mock("@/hooks/useAccount", () => ({
  useAccount: vi.fn(),
}));

import { useAccount } from "@/hooks/useAccount";

describe("ChatCrossLink", () => {
  it("renders the cross-link footer when hasActiveSubscription=true", () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null, loading: false, error: null, refresh: vi.fn(),
      hasActiveSubscription: true,
    });
    render(<ChatCrossLink />);
    expect(screen.getByText(/general chat/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://chat.thefixer.in");
  });

  it("renders nothing when hasActiveSubscription=false", () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null, loading: false, error: null, refresh: vi.fn(),
      hasActiveSubscription: false,
    });
    const { container } = render(<ChatCrossLink />);
    expect(container).toBeEmptyDOMElement();
  });
});
