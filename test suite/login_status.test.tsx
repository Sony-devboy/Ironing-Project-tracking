import React from "react";
import { render, screen } from "@testing-library/react";
import LoginStatusCard from "@/components/LoginStatusCard";

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: {
    subscription: {
      unsubscribe: jest.fn(),
    },
  },
});

jest.mock("@/utils/supabase/client", () => ({
  createClient() {
    return {
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    };
  },
}));

describe("LoginStatusCard OAuth health checks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  test("shows Login Working with username when a session exists", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            email: "developer@iron.com",
            user_metadata: { user_name: "gituser" },
          },
        },
      },
      error: null,
    });

    render(<LoginStatusCard />);

    expect(await screen.findByText("Login Working")).toBeInTheDocument();
    expect(screen.getByText("gituser")).toBeInTheDocument();

    const dot = screen.getByTestId("login-status-dot");
    expect(dot).toHaveStyle({ backgroundColor: "#2e7d32" });

    // Provider probe is unnecessary when already signed in
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("shows Ready when no session but the GitHub provider redirects", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      type: "opaqueredirect",
      ok: false,
      status: 0,
    });

    render(<LoginStatusCard />);

    expect(await screen.findByText("Ready — Not Signed In")).toBeInTheDocument();

    const dot = screen.getByTestId("login-status-dot");
    expect(dot).toHaveStyle({ backgroundColor: "#f57c00" });
  });

  test("shows Login Unavailable with detail when the provider is disabled", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      type: "basic",
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ msg: "Unsupported provider: provider is not enabled" }),
    });

    render(<LoginStatusCard />);

    expect(await screen.findByText("Login Unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("login-status-detail")).toHaveTextContent(
      "Unsupported provider: provider is not enabled"
    );

    const dot = screen.getByTestId("login-status-dot");
    expect(dot).toHaveStyle({ backgroundColor: "#d32f2f" });
  });

  test("shows Login Unavailable when the auth endpoint is unreachable", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("network down"));

    render(<LoginStatusCard />);

    expect(await screen.findByText("Login Unavailable")).toBeInTheDocument();

    const dot = screen.getByTestId("login-status-dot");
    expect(dot).toHaveStyle({ backgroundColor: "#d32f2f" });
  });
});
