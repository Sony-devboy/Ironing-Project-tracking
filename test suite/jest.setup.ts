import "@testing-library/jest-dom";

// Mock matchMedia which is not implemented by JSDOM
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Clear localStorage and document attributes between test runs to ensure independent tests
beforeEach(() => {
  try {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  } catch (e) {
    console.error("Failed to clear localStorage or DOM state in tests", e);
  }
  jest.clearAllMocks();
});
