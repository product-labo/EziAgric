import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionWarning } from "../SessionWarning";

describe("SessionWarning", () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not render when warning is null", () => {
    const { container } = render(
      <SessionWarning warning={null} onRefresh={mockOnRefresh} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders when warning is provided", () => {
    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByText("Session Expiring")).toBeInTheDocument();
    expect(screen.getByText("Session expires in 5 minutes")).toBeInTheDocument();
  });

  it("shows refresh button", () => {
    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByRole("button", { name: /refresh now/i })).toBeInTheDocument();
  });

  it("shows dismiss button", () => {
    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it("calls onRefresh when refresh button is clicked", async () => {
    mockOnRefresh.mockResolvedValue(undefined);

    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh now/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it("shows loading state while refreshing", async () => {
    mockOnRefresh.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh now/i });
    fireEvent.click(refreshButton);

    expect(screen.getByText("Refreshing...")).toBeInTheDocument();
    expect(refreshButton).toBeDisabled();
  });

  it("disables buttons while refreshing", async () => {
    mockOnRefresh.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh now/i });
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });

    fireEvent.click(refreshButton);

    expect(refreshButton).toBeDisabled();
    expect(dismissButton).toBeDisabled();
  });

  it("hides after successful refresh", async () => {
    mockOnRefresh.mockResolvedValue(undefined);

    const { container } = render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh now/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("hides when dismiss button is clicked", () => {
    const { container } = render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(container.firstChild).toBeNull();
  });

  it("reappears when dismissed and warning changes", () => {
    const { rerender, container } = render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    // Dismiss
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);
    expect(container.firstChild).toBeNull();

    // Warning changes
    rerender(
      <SessionWarning
        warning="Session expires in 3 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    // Should reappear
    expect(screen.getByText("Session expires in 3 minutes")).toBeInTheDocument();
  });

  it("resets dismissed state when warning becomes null", () => {
    const { rerender } = render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    // Dismiss
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    // Warning becomes null
    rerender(<SessionWarning warning={null} onRefresh={mockOnRefresh} />);

    // Warning comes back with same message
    rerender(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    // Should show again
    expect(screen.getByText("Session expires in 5 minutes")).toBeInTheDocument();
  });

  it("handles refresh errors gracefully", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    mockOnRefresh.mockRejectedValue(new Error("Refresh failed"));

    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /refresh now/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to refresh session:",
        expect.any(Error)
      );
    });

    // Should still be visible after error
    expect(screen.getByText("Session expires in 5 minutes")).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it("applies correct styling for warning state", () => {
    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    const warningDiv = screen.getByText("Session expires in 5 minutes").closest("div");
    expect(warningDiv).toHaveClass("border-status-warning/30");
  });

  it("displays warning icon", () => {
    render(
      <SessionWarning
        warning="Session expires in 5 minutes"
        onRefresh={mockOnRefresh}
      />
    );

    const icon = screen.getByText("Session expires in 5 minutes")
      .closest("div")
      ?.querySelector("svg");

    expect(icon).toBeInTheDocument();
  });
});
