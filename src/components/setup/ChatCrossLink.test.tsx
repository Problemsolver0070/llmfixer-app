import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatCrossLink } from "./ChatCrossLink";

describe("ChatCrossLink", () => {
  it("renders the cross-link footer for any signed-in user", () => {
    render(<ChatCrossLink />);
    expect(screen.getByText(/general chat/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://chat.thefixer.in");
  });
});
