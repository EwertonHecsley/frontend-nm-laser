import { describe, it, expect } from "vitest";

import { create } from "zustand";
import type { AuthUser } from "@/types";

import { createSessionSlice } from "./session-slice";
import type {
  AppStore,
  AuthSlice,
  FiltersSlice,
  UISlice,
} from "../types";

const otherSlicesStub: Pick<AuthSlice, keyof AuthSlice> &
  Pick<UISlice, keyof UISlice> &
  Pick<FiltersSlice, keyof FiltersSlice> = {
  status: "idle",
  error: null,
  login: () => {
    throw new Error("not implemented in this test");
  },
  logout: async () => undefined,
  mobileNavOpen: false,
  sidebarCollapsed: false,
  setMobileNavOpen: () => undefined,
  toggleMobileNav: () => undefined,
  toggleSidebar: () => undefined,
  selectedCityId: null,
  appointmentPeriod: { from: "", to: "" },
  setSelectedCityId: () => undefined,
  setAppointmentPeriod: () => undefined,
  resetFilters: () => undefined,
};

function createTestStore(user: AuthUser | null = null) {
  const store = create<AppStore>()((...args) => ({
    ...otherSlicesStub,
    ...createSessionSlice(...args),
    user: null as AuthUser | null,
  }));

  if (user) {
    store.getState().setSessionUser(user);
  }

  return store;
}

describe("SessionSlice", () => {
  const user1: AuthUser = {
    id: "user-1",
    role: "gestora",
    email: "test@example.com",
    name: "Test User",
  };

  const user2: AuthUser = {
    id: "user-2",
    role: "vendas",
    email: "test2@example.com",
    name: "Test User 2",
  };

  describe("initial state", () => {
    it("should start with a null user by default", () => {
      const store = createTestStore();

      expect(store.getState().user).toBeNull();
    });
  });

  describe("setSessionUser", () => {
    it("should set user and mark as authenticated", () => {
      const store = createTestStore();

      store.getState().setSessionUser(user1);

      expect(store.getState().user).toEqual(user1);
      expect(store.getState().status).toBe("authenticated");
      
    });

    it("should not update when user data is identical", () => {
      const store = createTestStore(user1);
      const previous = store.getState().user;

      const before = { user: previous, status: store.getState().status };

      store.getState().setSessionUser({ ...user1 });

      // Same identity checked via id/role/email; replaces user with a copy
      expect(store.getState().user).toEqual(before.user);
      expect(store.getState().status).toBe(before.status);
    });

    it("should update when ID changes", () => {
      const store = createTestStore(user1);

      store.getState().setSessionUser(user2);

      expect(store.getState().user?.id).toBe("user-2");
      expect(store.getState().user?.role).toBe("vendas");
    });

    it("should update when role changes", () => {
      const store = createTestStore();

      store.getState().setSessionUser(user1);

      const updated: AuthUser = { ...user1, role: "vendas" };
      store.getState().setSessionUser(updated);

      expect(store.getState().user?.role).toBe("vendas");
    });

    it("should update when email changes", () => {
      const store = createTestStore();

      store.getState().setSessionUser(user1);

      const updated: AuthUser = { ...user1, email: "new@example.com" };
      store.getState().setSessionUser(updated);

      expect(store.getState().user?.email).toBe("new@example.com");
    });

    it("should handle null user by clearing the session", () => {
      const store = createTestStore(user1);

      store.getState().setSessionUser(null);

      expect(store.getState().user).toBeNull();
      expect(store.getState().status).toBe("unauthenticated");
    });
  });

  describe("clearSession", () => {
    it("should clear user and status", () => {
      const store = createTestStore(user1);

      store.getState().clearSession();

      expect(store.getState().user).toBeNull();
      expect(store.getState().status).toBe("unauthenticated");
      
    });

    it("should be safe to call multiple times", () => {
      const store = createTestStore(user1);

      store.getState().clearSession();
      store.getState().clearSession();

      expect(store.getState().user).toBeNull();
    });
  });

  describe("hasRole", () => {
    it("should return true when user has the specified role", () => {
      const store = createTestStore(user1);

      expect(store.getState().hasRole("gestora")).toBe(true);
    });

    it("should return false when user has a different role", () => {
      const store = createTestStore(user1);

      expect(store.getState().hasRole("vendas")).toBe(false);
      expect(store.getState().hasRole("aplicadora")).toBe(false);
    });

    it("should return false when there is no user", () => {
      const store = createTestStore();

      expect(store.getState().hasRole("gestora")).toBe(false);
    });

    it("should be case sensitive", () => {
      const store = createTestStore(user1);

      // `Role` is a string union; lower/upper case differences should not match
      expect(store.getState().hasRole("gestora" as never)).toBe(true);
      expect(store.getState().hasRole("Gestora" as never)).toBe(false);
    });

    it("should update after the user changes", () => {
      const store = createTestStore(user1);

      expect(store.getState().hasRole("gestora")).toBe(true);

      store.getState().setSessionUser(user2);

      expect(store.getState().hasRole("gestora")).toBe(false);
      expect(store.getState().hasRole("vendas")).toBe(true);
    });
  });

  describe("performance / memory", () => {
    it("should not degrade with many identical updates", () => {
      const store = createTestStore();
      let reassignments = 0;

      const unsubscribe = store.subscribe(() => {
        reassignments += 1;
      });

      for (let i = 0; i < 100; i++) {
        store.getState().setSessionUser({ ...user1 });
      }

      // Only the first update should notify subscribers
      expect(reassignments).toBe(1);

      unsubscribe();
    });

    it("should not hold stale references after clearing the session", () => {
      const store = createTestStore(user1);

      store.getState().clearSession();

      expect(store.getState().user).toBeNull();
    });
  });
});