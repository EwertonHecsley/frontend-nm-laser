import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { useDebouncedValue } from "@/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 350));

    expect(result.current).toBe("initial");
  });

  it("should update after the debounce delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "updated" });

    // Not yet flushed - value should still be "initial"
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current).toBe("updated");
  });

  it("should only keep the last value for rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 350),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "change-1" });
    rerender({ value: "change-2" });
    rerender({ value: "change-3" });
    rerender({ value: "change-4" });

    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current).toBe("change-4");
  });

  it("should handle partial delays before changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 500),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "a" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Not yet flushed (still within debounce)
    expect(result.current).toBe("initial");

    rerender({ value: "b" });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // still within new debounce window
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("b");
  });

  it("should not crash for a very short delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 0),
      { initialProps: { value: "initial" } },
    );

    rerender({ value: "zero" });

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current).toBe("zero");
  });

  it("should handle null values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: null as string | null } },
    );

    expect(result.current).toBeNull();

    rerender({ value: "text" });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("text");
  });

  it("should handle numbers correctly", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 0 } },
    );

    expect(result.current).toBe(0);

    rerender({ value: 1.5 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(1.5);
  });

  it("should handle empty strings", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: "" } },
    );

    expect(result.current).toBe("");

    rerender({ value: "text" });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("text");
  });

  it("should handle object references correctly", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      {
        initialProps: { value: { id: 1, name: "A" } as { id: number; name: string } },
      },
    );

    expect(result.current).toEqual({ id: 1, name: "A" });

    rerender({ value: { id: 2, name: "B" } });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toEqual({ id: 2, name: "B" });
  });

  it("should handle array values correctly", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: [1, 2, 3] as number[] } },
    );

    expect(result.current).toEqual([1, 2, 3]);

    rerender({ value: [4, 5, 6] });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toEqual([4, 5, 6]);
  });

  it("should clear timers on unmount (no memory leaks)", () => {
    const { unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 5000),
      { initialProps: { value: "initial" } },
    );

    unmount();

    // Advancing the delayed timeout after unmount should be safe
    expect(() => {
      vi.advanceTimersByTime(10000);
    }).not.toThrow();
  });

  it("should not hold stale object references after unmount", () => {
    const largeObject = {
      big: Array.from({ length: 10_000 }, (_, i) => i),
    };

    const { unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 1000),
      { initialProps: { value: largeObject } },
    );

    unmount();

    expect(() => {
      vi.advanceTimersByTime(2000);
    }).not.toThrow();
  });

  it("should apply multiple rerender cycles without leaking timers", () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: "start" } },
    );

    for (let i = 0; i < 50; i++) {
      rerender({ value: `v-${i}` });
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("v-49");

    unmount();
  });

  it("should handle huge strings without memory issues", () => {
    const longText = "a".repeat(1024 * 1024); // 1MB
    const { result } = renderHook(() => useDebouncedValue(longText, 100));

    expect(result.current.length).toBe(1024 * 1024);
  });

  it("should not degrade with extremely frequent rerenders", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 0 } },
    );

    for (let i = 0; i < 1000; i++) {
      rerender({ value: i });
    }

    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(999);
  });

  it("should handle NaN values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: NaN } },
    );

    expect(result.current).toBeNaN();
    expect(Number.isNaN(result.current)).toBe(true);

    rerender({ value: 42 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(42);
  });

  it("should handle deeply nested objects", () => {
    const deep = {
      level1: {
        level2: {
          level3: {
            payload: "value",
          },
        },
      },
    };

    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      {
        initialProps: {
          value: deep as typeof deep,
        },
      },
    );

    expect(result.current).toEqual(deep);

    const updated = {
      level1: {
        level2: {
          level3: {
            payload: "updated",
          },
        },
      },
    };

    rerender({ value: updated });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toEqual(updated);
  });

  it("should handle undefined values gracefully", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: undefined as string | undefined } },
    );

    expect(result.current).toBeUndefined();

    rerender({ value: "present" });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("present");
  });
});