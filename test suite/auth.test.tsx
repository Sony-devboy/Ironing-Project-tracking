import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Topbar from "@/components/Topbar";
import BackendStatusCard from "@/components/BackendStatusCard";
import { ThemeProvider } from "@/components/ThemeProvider";

const mockSignInWithOAuth = jest.fn().mockResolvedValue({ error: null });
const mockSignOut = jest.fn().mockResolvedValue({ error: null });
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: {
    subscription: {
      unsubscribe: jest.fn(),
    },
  },
});

const mockSelect = jest.fn();
const mockLimit = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  createClient() {
    return {
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
        signInWithOAuth: mockSignInWithOAuth,
        signOut: mockSignOut,
      },
      from: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
    };
  },
}));

describe("Authentication Integration & UI states", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Topbar Authentication States", () => {
    test("renders user profile, avatar, and handles sign out action when logged in", async () => {
      // Mock active authenticated user session
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            email: "testuser@gmail.com",
            user_metadata: {
              avatar_url: "https://github.com/avatar.png",
              user_name: "gituser",
            },
          },
        },
        error: null,
      });

      render(
        <ThemeProvider>
          <Topbar />
        </ThemeProvider>
      );

      // Wait for loader to resolve
      await waitFor(() => {
        expect(screen.queryByTestId("auth-loading")).not.toBeInTheDocument();
      });

      // Verify profile is rendered
      expect(screen.getByTestId("user-profile")).toBeInTheDocument();
      expect(screen.getByText("gituser")).toBeInTheDocument();
      
      const avatar = screen.getByTestId("user-avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute("src", "https://github.com/avatar.png");

      // Verify sign out click
      const logoutBtn = screen.getByTestId("logout-btn");
      expect(logoutBtn).toBeInTheDocument();
      fireEvent.click(logoutBtn);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe("BackendStatusCard Health checks", () => {
    test("renders checking, then connected state with user email and pending trigger configuration", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            email: "developer@iron.com",
          },
        },
        error: null,
      });

      // Simulate projects table missing (Phase 1, table not created yet)
      mockSelect.mockReturnValue({
        limit: mockLimit.mockResolvedValueOnce({ data: null, error: { message: "relation does not exist" } }),
      });

      render(<BackendStatusCard />);

      // Verify connection dot is connected green
      const statusText = await screen.findByText("Backend Connected");
      expect(statusText).toBeInTheDocument();

      const dot = screen.getByTestId("backend-status-dot");
      expect(dot).toHaveStyle({ backgroundColor: "#2e7d32" });

      expect(screen.getByText("developer@iron.com")).toBeInTheDocument();
      expect(screen.getByText("Pending Setup (No Projects Table)")).toBeInTheDocument();
    });

    test("renders connection failed status when API returns error", async () => {
      mockGetUser.mockRejectedValueOnce(new Error("Supabase auth error"));

      render(<BackendStatusCard />);

      const failedText = await screen.findByText("Connection Failed");
      expect(failedText).toBeInTheDocument();

      const dot = screen.getByTestId("backend-status-dot");
      expect(dot).toHaveStyle({ backgroundColor: "#d32f2f" });
    });
  });
});
