import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MainAppPage from "@/app/mainapp/page";
import CompanyInfoPage from "@/app/company/page";
import SettingsPage from "@/app/settings/page";

const loggedInSession = {
  data: {
    session: {
      user: {
        email: "member@iron.com",
        user_metadata: { user_name: "member" },
      },
    },
  },
  error: null,
};
const loggedOutSession = { data: { session: null }, error: null };

// Default: an authenticated member, so the page content tests exercise the
// unlocked state. Locked-state tests override with mockResolvedValueOnce.
const mockGetSession = jest.fn().mockResolvedValue(loggedInSession);
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null });
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
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
  },
}));

describe("Subpages and Tab Selectors Test Suite", () => {
  describe("Main App Page", () => {
    test("renders title, description, all tabs, and toggles content on tab click when logged in", async () => {
      render(<MainAppPage />);

      // Content appears once the auth guard resolves the session
      const tabFeatures = await screen.findByTestId("tab-features");

      // Title & Subtitle check
      expect(screen.getByText("Main Application")).toBeInTheDocument();
      expect(screen.getByText(/Core product functionality/i)).toBeInTheDocument();

      // Tab buttons exist
      const tabTickets = screen.getByTestId("tab-tickets");
      const tabNotes = screen.getByTestId("tab-notes");

      // Initial active state: Features content should be visible
      expect(tabFeatures).toHaveClass("active");
      expect(screen.getByTestId("content-features")).toBeInTheDocument();
      expect(screen.getByText("Features - WIP")).toBeInTheDocument();

      // Tickets/Notes content should not be in the document
      expect(screen.queryByTestId("content-tickets")).not.toBeInTheDocument();
      expect(screen.queryByTestId("content-notes")).not.toBeInTheDocument();

      // Click Tickets Tab
      fireEvent.click(tabTickets);
      expect(tabTickets).toHaveClass("active");
      expect(tabFeatures).not.toHaveClass("active");
      expect(screen.getByTestId("content-tickets")).toBeInTheDocument();
      expect(screen.getByText("Tickets - WIP")).toBeInTheDocument();
      expect(screen.queryByTestId("content-features")).not.toBeInTheDocument();

      // Click Notes Tab
      fireEvent.click(tabNotes);
      expect(tabNotes).toHaveClass("active");
      expect(tabTickets).not.toHaveClass("active");
      expect(screen.getByTestId("content-notes")).toBeInTheDocument();
      expect(screen.getByText("Notes - WIP")).toBeInTheDocument();
      expect(screen.queryByTestId("content-tickets")).not.toBeInTheDocument();
    });

    test("shows sign-in required lock instead of content when logged out", async () => {
      mockGetSession.mockResolvedValueOnce(loggedOutSession);

      render(<MainAppPage />);

      expect(await screen.findByTestId("auth-guard-locked")).toBeInTheDocument();
      expect(screen.getByText("Sign in required")).toBeInTheDocument();

      // None of the member content is rendered
      expect(screen.queryByTestId("tab-features")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-content-panel")).not.toBeInTheDocument();
    });
  });

  describe("Company Info Page", () => {
    test("renders title, description, all tabs, and toggles content on tab click when logged in", async () => {
      render(<CompanyInfoPage />);

      // Content appears once the auth guard resolves the session
      const tabOverview = await screen.findByTestId("tab-overview");

      // Title & Subtitle check
      expect(screen.getByText("Company Info")).toBeInTheDocument();
      expect(screen.getByText(/Overview of enterprise structure/i)).toBeInTheDocument();

      const tabNotes = screen.getByTestId("tab-notes");

      // Initial active state: Overview content should be visible
      expect(tabOverview).toHaveClass("active");
      expect(screen.getByTestId("content-overview")).toBeInTheDocument();
      expect(screen.getByText("Overview - WIP")).toBeInTheDocument();
      expect(screen.queryByTestId("content-notes")).not.toBeInTheDocument();

      // Click Notes Tab
      fireEvent.click(tabNotes);
      expect(tabNotes).toHaveClass("active");
      expect(tabOverview).not.toHaveClass("active");
      expect(screen.getByTestId("content-notes")).toBeInTheDocument();
      expect(screen.getByText("Notes - WIP")).toBeInTheDocument();
      expect(screen.queryByTestId("content-overview")).not.toBeInTheDocument();
    });

    test("shows sign-in required lock instead of content when logged out", async () => {
      mockGetSession.mockResolvedValueOnce(loggedOutSession);

      render(<CompanyInfoPage />);

      expect(await screen.findByTestId("auth-guard-locked")).toBeInTheDocument();
      expect(screen.getByText("Sign in required")).toBeInTheDocument();

      // None of the member content is rendered
      expect(screen.queryByTestId("tab-overview")).not.toBeInTheDocument();
      expect(screen.queryByTestId("tab-content-panel")).not.toBeInTheDocument();
    });
  });

  describe("Settings Page", () => {
    test("renders title and WIP message without requiring login", async () => {
      mockGetSession.mockResolvedValueOnce(loggedOutSession);

      render(<SettingsPage />);

      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText(/Configure application variables/i)).toBeInTheDocument();
      expect(screen.getByText("Settings - WIP")).toBeInTheDocument();
    });
  });
});
