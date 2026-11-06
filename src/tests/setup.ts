import { vi } from "vitest";
import "@testing-library/jest-dom";

// MatchMedia mock configurável por teste (default: sem dark mode no sistema).
export const mockMatchMedia = (matches = false) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

mockMatchMedia(false);

// Mock ResizeObserver (usado por @radix-ui/react-use-size)
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

// Mock Popper (usado por @radix-ui/react-tooltip)
vi.mock("@radix-ui/react-popper", () => ({
  ...vi.importActual("@radix-ui/react-popper"),
  usePopper: vi.fn(),
}));
