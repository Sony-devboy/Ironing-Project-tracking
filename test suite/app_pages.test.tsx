import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MainAppPage from "@/app/mainapp/page";
import CompanyInfoPage from "@/app/company/page";
import SettingsPage from "@/app/settings/page";
import HistoryPage from "@/app/history/page";
import ChatPage from "@/app/chat/page";
import ImprovementsPage from "@/app/improvements/page";

const loggedInSession = {
  data: {
    session: {
      user: {
        id: "user-1",
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

// Chainable, awaitable stand-in for the supabase query builder that always
// resolves to an empty successful result.
function makeQueryBuilder() {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "order", "limit", "eq", "is", "insert", "update", "upsert", "delete", "single", "maybeSingle"]) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (value: { data: unknown[]; error: null }) => void) =>
    resolve({ data: [], error: null });
  return builder;
}

jest.mock("@/utils/supabase/client", () => ({
  createClient() {
    return {
      auth: {
        getSession: mockGetSession,
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
        updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      },
      from: jest.fn(() => makeQueryBuilder()),
    };
  },
}));

describe("Subpages and Tab Selectors Test Suite", () => {
  describe("Main App Page", () => {
    test("renders Overview as the first, default tab and toggles through all tabs when logged in", async () => {
      render(<MainAppPage />);

      // Content appears once the auth guard resolves the session
      const tabOverview = await screen.findByTestId("tab-overview");

      // Title & Subtitle check
      expect(screen.getByText("Main Application")).toBeInTheDocument();
      expect(screen.getByText(/Core product functionality/i)).toBeInTheDocument();

      // All four tabs exist, Overview first and active by default
      const tabFeatures = screen.getByTestId("tab-features");
      const tabTickets = screen.getByTestId("tab-tickets");
      const tabNotes = screen.getByTestId("tab-notes");
      expect(tabOverview).toHaveClass("active");
      expect(screen.getByTestId("content-overview")).toBeInTheDocument();
      expect(await screen.findByText("Recent Activity")).toBeInTheDocument();

      // Tab order: Overview must be the first button
      const tabButtons = screen.getAllByRole("button", { name: /Overview|Features|Tickets|Notes/ });
      expect(tabButtons[0]).toHaveTextContent("Overview");

      // Click Features Tab -> add-feature form is available
      fireEvent.click(tabFeatures);
      expect(tabFeatures).toHaveClass("active");
      expect(screen.getByTestId("content-features")).toBeInTheDocument();
      expect(await screen.findByTestId("feature-name-input")).toBeInTheDocument();
      expect(screen.getByTestId("features-empty")).toBeInTheDocument();
      expect(screen.queryByTestId("content-overview")).not.toBeInTheDocument();

      // Click Tickets Tab
      fireEvent.click(tabTickets);
      expect(tabTickets).toHaveClass("active");
      expect(screen.getByTestId("content-tickets")).toBeInTheDocument();
      expect(await screen.findByTestId("tickets-empty")).toBeInTheDocument();

      // Click Notes Tab -> live notes panel with add form
      fireEvent.click(tabNotes);
      expect(tabNotes).toHaveClass("active");
      expect(screen.getByTestId("content-notes")).toBeInTheDocument();
      expect(await screen.findByTestId("note-heading-input")).toBeInTheDocument();
      expect(screen.getByTestId("note-body-input")).toBeInTheDocument();
      expect(screen.getByTestId("notes-empty")).toBeInTheDocument();
    });

    test("shows sign-in required lock instead of content when logged out", async () => {
      mockGetSession.mockResolvedValueOnce(loggedOutSession);

      render(<MainAppPage />);

      expect(await screen.findByTestId("auth-guard-locked")).toBeInTheDocument();
      expect(screen.getByText("Sign in required")).toBeInTheDocument();

      // None of the member content is rendered
      expect(screen.queryByTestId("tab-overview")).not.toBeInTheDocument();
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

  describe("History Page", () => {
    test("renders empty history for a logged-in member", async () => {
      render(<HistoryPage />);

      expect(await screen.findByText("History")).toBeInTheDocument();
      expect(await screen.findByTestId("history-empty")).toBeInTheDocument();
    });

    test("shows sign-in required lock when logged out", async () => {
      mockGetSession.mockResolvedValueOnce(loggedOutSession);

      render(<HistoryPage />);

      expect(await screen.findByTestId("auth-guard-locked")).toBeInTheDocument();
      expect(screen.queryByTestId("history-empty")).not.toBeInTheDocument();
    });
  });

  describe("Local Chat Page", () => {
    test("renders the chat room with input for a logged-in member", async () => {
      render(<ChatPage />);

      expect(await screen.findByText("Local Chat")).toBeInTheDocument();
      expect(await screen.findByTestId("chat-room")).toBeInTheDocument();
      expect(screen.getByTestId("chat-empty")).toBeInTheDocument();
      expect(screen.getByTestId("chat-input")).toBeInTheDocument();
      expect(screen.getByTestId("chat-send-btn")).toBeDisabled();
    });

    test("shows sign-in required lock when logged out", async () => {
      mockGetSession.mockResolvedValueOnce(loggedOutSession);

      render(<ChatPage />);

      expect(await screen.findByTestId("auth-guard-locked")).toBeInTheDocument();
      expect(screen.queryByTestId("chat-room")).not.toBeInTheDocument();
    });
  });

  describe("Improvements Page", () => {
    test("renders add button and empty state for a logged-in member", async () => {
      render(<ImprovementsPage />);

      expect(await screen.findByText("Improvements")).toBeInTheDocument();
      const addBtn = await screen.findByTestId("show-improvement-form-btn");
      expect(screen.getByTestId("improvements-empty")).toBeInTheDocument();

      // Clicking the add button reveals the heading + description form
      fireEvent.click(addBtn);
      expect(screen.getByTestId("improvement-heading-input")).toBeInTheDocument();
      expect(screen.getByTestId("improvement-body-input")).toBeInTheDocument();
      expect(screen.getByTestId("add-improvement-btn")).toBeDisabled();
    });

    test("shows sign-in required lock when logged out", async () => {
      mockGetSession.mockResolvedValueOnce(loggedOutSession);

      render(<ImprovementsPage />);

      expect(await screen.findByTestId("auth-guard-locked")).toBeInTheDocument();
      expect(screen.queryByTestId("improvements-board")).not.toBeInTheDocument();
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

    test("shows the display-name editor for a logged-in member", async () => {
      render(<SettingsPage />);

      const input = await screen.findByTestId("profile-name-input");
      expect(input).toBeInTheDocument();
      // Prefilled with the user's current name (GitHub username fallback)
      expect((input as HTMLInputElement).value).toBe("member");
      expect(screen.getByTestId("profile-save-btn")).toBeInTheDocument();
    });
  });
});
