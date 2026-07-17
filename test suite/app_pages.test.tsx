import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MainAppPage from "@/app/mainapp/page";
import CompanyInfoPage from "@/app/company/page";
import SettingsPage from "@/app/settings/page";

// Mock Supabase client to prevent crashes in BackendStatusCard rendered in SettingsPage
jest.mock("@/utils/supabase/client", () => ({
  createClient() {
    return {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
        getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: jest.fn().mockReturnValue({
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
  },
}));

describe("Subpages and Tab Selectors Test Suite", () => {
  describe("Main App Page", () => {
    test("renders title, description, all tabs, and toggles content on tab click", () => {
      render(<MainAppPage />);

      // Title & Subtitle check
      expect(screen.getByText("Main Application")).toBeInTheDocument();
      expect(screen.getByText(/Core product functionality/i)).toBeInTheDocument();

      // Tab buttons exist
      const tabFeatures = screen.getByTestId("tab-features");
      const tabTickets = screen.getByTestId("tab-tickets");
      const tabNotes = screen.getByTestId("tab-notes");

      expect(tabFeatures).toBeInTheDocument();
      expect(tabTickets).toBeInTheDocument();
      expect(tabNotes).toBeInTheDocument();

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
  });

  describe("Company Info Page", () => {
    test("renders title, description, all tabs, and toggles content on tab click", () => {
      render(<CompanyInfoPage />);

      // Title & Subtitle check
      expect(screen.getByText("Company Info")).toBeInTheDocument();
      expect(screen.getByText(/Overview of enterprise structure/i)).toBeInTheDocument();

      // Tab buttons exist
      const tabOverview = screen.getByTestId("tab-overview");
      const tabNotes = screen.getByTestId("tab-notes");

      expect(tabOverview).toBeInTheDocument();
      expect(tabNotes).toBeInTheDocument();

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
  });

  describe("Settings Page", () => {
    test("renders title and WIP message", () => {
      render(<SettingsPage />);

      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText(/Configure application variables/i)).toBeInTheDocument();
      expect(screen.getByText("Settings - WIP")).toBeInTheDocument();
    });
  });
});
