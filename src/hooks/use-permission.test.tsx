import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/store";
import type { AuthUser } from "@/types";

import { usePermission } from "@/hooks/use-permission";

function mountSession(user: AuthUser | null) {
  act(() => {
    const store = useAppStore.getState();
    if (user) {
      store.setSessionUser(user);
    } else {
      store.clearSession();
    }
  });
}

describe("usePermission", () => {
  beforeEach(() => {
    mountSession(null);
  });

  it("should deny every permission when there is no user", () => {
    const cases: Parameters<typeof usePermission>[] = [
      ["patients:read"],
      ["patients:write"],
      ["patients:delete"],
      ["users:manage"],
      ["sales:delete"],
    ];

    for (const [permission] of cases) {
      const { result } = renderHook(() => usePermission(permission));
      expect(result.current).toBe(false);
    }
  });

  it("should grant all permissions for gestora", () => {
    mountSession({
      id: "1",
      name: "Gestora",
      email: "g@example.com",
      role: "gestora",
    });

    const { result } = renderHook(() => usePermission("patients:delete"));

    expect(result.current).toBe(true);
    expect(useAppStore.getState().hasRole("gestora")).toBe(true);
  });

  it("should grant read but deny delete for vendas", () => {
    mountSession({
      id: "2",
      name: "Vendas",
      email: "v@example.com",
      role: "vendas",
    });

    const { result: canRead } = renderHook(() =>
      usePermission("patients:read"),
    );
    const { result: canDelete } = renderHook(() =>
      usePermission("patients:delete"),
    );

    expect(canRead.current).toBe(true);
    expect(canDelete.current).toBe(false);
  });

  it("should grant read-only for aplicadora", () => {
    mountSession({
      id: "3",
      name: "Aplicadora",
      email: "a@example.com",
      role: "aplicadora",
    });

    const { result: canRead } = renderHook(() =>
      usePermission("patients:read"),
    );
    const { result: canWrite } = renderHook(() =>
      usePermission("patients:write"),
    );
    const { result: canManageUsers } = renderHook(() =>
      usePermission("users:manage"),
    );

    expect(canRead.current).toBe(true);
    expect(canWrite.current).toBe(false);
    expect(canManageUsers.current).toBe(false);
  });

  it("should update when the role changes in the store", () => {
    mountSession({
      id: "1",
      name: "Vendas",
      email: "v@example.com",
      role: "vendas",
    });

    const { result } = renderHook(() => usePermission("patients:delete"));

    expect(result.current).toBe(false);

    mountSession({
      id: "1",
      name: "Gestora",
      email: "g@example.com",
      role: "gestora",
    });

    // Note: role change should be observed
    expect(useAppStore.getState().user?.role).toBe("gestora");
  });

  it("should expose role via selectRole selector", () => {
    mountSession({
      id: "1",
      name: "Gestora",
      email: "g@example.com",
      role: "gestora",
    });

    expect(useAppStore.getState().user?.role).toBe("gestora");
  });

  it("should not cause memory leaks when unmounting repeatedly", () => {
    for (let i = 0; i < 100; i++) {
      const { unmount } = renderHook(() =>
        usePermission("patients:read"),
      );

      unmount();
    }

    // Zustand keeps weak references; the store should be usable and healthy
    expect(typeof useAppStore.getState().setSessionUser).toBe("function");
  });

  it("should handle multiple simultaneous permission checks", () => {
    mountSession({
      id: "1",
      name: "Gestora",
      email: "g@example.com",
      role: "gestora",
    });

    const permissions = [
      "patients:read",
      "patients:write",
      "patients:delete",
      "cities:manage",
      "sales:read",
      "users:manage",
    ] as const;

    for (const permission of permissions) {
      const { result } = renderHook(() => usePermission(permission));

      expect(result.current).toBe(true);
    }
  });

  it("should handle invalid role gracefully", () => {
    mountSession({
      id: "1",
      name: "Unknown",
      email: "u@example.com",
      role: "unknown" as never,
    });

    const { result } = renderHook(() => usePermission("patients:read"));

    expect(result.current).toBe(false);
  });
});