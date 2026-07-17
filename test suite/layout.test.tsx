import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import LayoutWrapper from "@/components/LayoutWrapper";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import GitStatusCard from "@/components/GitStatusCard";

// Mock next/navigation for JSDOM layout tests
jest.mock("next/navigation", () => ({
  usePathname() {
    return "/";
  },
}));

// Mock Supabase Auth and Database operations
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

jest.mock("@/utils/supabase/client", () => ({
  createClient() {
    return {
      auth: {
        getUser: mockGetUser,
        onAuthStateChange: mockOnAuthStateChange,
        signInWithOAuth: mockSignInWithOAuth,
        signOut: mockSignOut,
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
  },
}));

// Dummy content child
const MockChild = () => {
  const { theme } = useTheme();
  return <div data-testid="mock-child">Active Theme: {theme}</div>;
};

// Helper to render layout with ThemeProvider
const renderLayout = () => {
  return render(
    <ThemeProvider>
      <LayoutWrapper>
        <MockChild />
      </LayoutWrapper>
    </ThemeProvider>
  );
};

describe("IRON Layout & Theme Test Suite", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    // Prevent alert from throwing "not implemented" error in JSDOM
    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
    // Reset fetch mock
    if (global.fetch) {
      (global.fetch as jest.Mock).mockClear();
    }
  });

  // Test theme toggling
  test("toggles theme and updates document attribute and localStorage", () => {
    renderLayout();

    const toggleBtn = screen.getByTestId("theme-toggle-btn");
    const child = screen.getByTestId("mock-child");
    
    // Default should be light mode (since system mock returns false for dark)
    expect(child).toHaveTextContent("Active Theme: light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // Click to toggle
    fireEvent.click(toggleBtn);
    expect(child).toHaveTextContent("Active Theme: dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("theme")).toBe("dark");

    // Click again to toggle back
    fireEvent.click(toggleBtn);
    expect(child).toHaveTextContent("Active Theme: light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem("theme")).toBe("light");
  });

  // Test theme initialization from localStorage
  test("initializes theme from localStorage when preset exists", () => {
    window.localStorage.setItem("theme", "dark");
    renderLayout();

    const child = screen.getByTestId("mock-child");
    expect(child).toHaveTextContent("Active Theme: dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  // Test system color preference resolution
  test("resolves default theme from media query if localStorage is empty", () => {
    // Override matchMedia mock to return dark mode as true
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    renderLayout();

    const child = screen.getByTestId("mock-child");
    expect(child).toHaveTextContent("Active Theme: dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  // Test Sidebar collapse/expand functionality (top header collapse button)
  test("collapses and expands sidebar on button click, modifying container class, aria-expanded, and localStorage", () => {
    renderLayout();

    const toggleBtn = screen.getByTestId("sidebar-toggle-btn");
    const container = screen.getByTestId("app-container");

    // Default: expanded (aria-expanded is true)
    expect(container).not.toHaveClass("sidebar-collapsed");
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");

    // Collapse sidebar
    fireEvent.click(toggleBtn);
    expect(container).toHaveClass("sidebar-collapsed");
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
    expect(window.localStorage.getItem("sidebar-collapsed")).toBe("true");

    // Expand sidebar again
    fireEvent.click(toggleBtn);
    expect(container).not.toHaveClass("sidebar-collapsed");
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");
    expect(window.localStorage.getItem("sidebar-collapsed")).toBe("false");
  });

  // Test Sidebar initialization from localStorage
  test("initializes sidebar collapse state from localStorage", () => {
    window.localStorage.setItem("sidebar-collapsed", "true");
    renderLayout();

    const container = screen.getByTestId("app-container");
    const toggleBtn = screen.getByTestId("sidebar-toggle-btn");

    expect(container).toHaveClass("sidebar-collapsed");
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
  });

  // Logged out: member-only sections are hidden from the sidebar entirely
  test("renders only Home and Settings sidebar links when logged out", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    render(
      <Sidebar isCollapsed={false} onToggle={() => {}} />
    );

    const homeLink = screen.getByTestId("nav-home");
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
    expect(homeLink).toHaveTextContent("Home");

    const settingsLink = screen.getByTestId("nav-settings");
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute("href", "/settings");
    expect(settingsLink).toHaveTextContent("Settings");

    await waitFor(() => {
      expect(screen.queryByTestId("nav-mainapp")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nav-company")).not.toBeInTheDocument();
    });
  });

  // Logged in: all sidebar navigation links are available
  test("renders all sidebar navigation links with hrefs when logged in", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { email: "member@iron.com" } },
      error: null,
    });

    render(
      <Sidebar isCollapsed={false} onToggle={() => {}} />
    );

    const mainappLink = await screen.findByTestId("nav-mainapp");
    expect(mainappLink).toHaveAttribute("href", "/mainapp");
    expect(mainappLink).toHaveTextContent("Main App");

    const companyLink = screen.getByTestId("nav-company");
    expect(companyLink).toHaveAttribute("href", "/company");
    expect(companyLink).toHaveTextContent("Company Info");

    const homeLink = screen.getByTestId("nav-home");
    expect(homeLink).toHaveAttribute("href", "/");
    expect(homeLink).toHaveTextContent("Home");

    const settingsLink = screen.getByTestId("nav-settings");
    expect(settingsLink).toHaveAttribute("href", "/settings");
    expect(settingsLink).toHaveTextContent("Settings");
  });

  // Test Topbar login button and OAuth sign-in trigger
  test("renders topbar login button and triggers OAuth sign-in when clicked", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    
    render(
      <ThemeProvider>
        <Topbar />
      </ThemeProvider>
    );

    // Wait for auth loader to resolve
    await waitFor(() => {
      expect(screen.queryByTestId("auth-loading")).not.toBeInTheDocument();
    });

    const loginBtn = screen.getByTestId("login-btn");
    expect(loginBtn).toBeInTheDocument();
    expect(loginBtn).toHaveTextContent("Log In");

    fireEvent.click(loginBtn);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: expect.stringContaining(window.location.origin),
      },
    });
  });

  // Test GitStatusCard: State = connected
  test("GitStatusCard renders connected state with green dot when API returns connected", async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ state: "connected", path: "C:\\Target\\Project" }),
      })
    );

    render(<GitStatusCard />);

    // Renders Connected text asynchronously
    const statusText = await screen.findByText("Connected");
    expect(statusText).toBeInTheDocument();

    // Verify dot state attribute resolves correctly
    const dot = screen.getByTestId("git-status-dot");
    expect(dot.getAttribute("data-state")).toBe("connected");
  });

  // Test GitStatusCard: State = disconnected
  test("GitStatusCard renders disconnected state with red dot when API returns disconnected", async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ state: "disconnected", path: "C:\\Target\\Project" }),
      })
    );

    render(<GitStatusCard />);

    const statusText = await screen.findByText("Not Connected");
    expect(statusText).toBeInTheDocument();

    const dot = screen.getByTestId("git-status-dot");
    expect(dot.getAttribute("data-state")).toBe("disconnected");
  });

  // Test GitStatusCard: State = unconfigured
  test("GitStatusCard renders unconfigured state when API returns unconfigured", async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ state: "unconfigured" }),
      })
    );

    render(<GitStatusCard />);

    const statusText = await screen.findByText("Not Configured");
    expect(statusText).toBeInTheDocument();

    const dot = screen.getByTestId("git-status-dot");
    expect(dot.getAttribute("data-state")).toBe("unconfigured");
  });

  // Test GitStatusCard: State = invalid-path
  test("GitStatusCard renders invalid path state when API returns invalid-path", async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ state: "invalid-path", path: "C:\\Bad\\Path" }),
      })
    );

    render(<GitStatusCard />);

    const statusText = await screen.findByText("Path Not Found");
    expect(statusText).toBeInTheDocument();

    const dot = screen.getByTestId("git-status-dot");
    expect(dot.getAttribute("data-state")).toBe("invalid-path");
  });

  // Test GitStatusCard: Rejection/Network failure
  test("GitStatusCard falls back to disconnected state on fetch API rejection", async () => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.reject(new Error("Network connection failure"))
    );

    render(<GitStatusCard />);

    const statusText = await screen.findByText("Not Connected");
    expect(statusText).toBeInTheDocument();

    const dot = screen.getByTestId("git-status-dot");
    expect(dot.getAttribute("data-state")).toBe("disconnected");
  });
});
