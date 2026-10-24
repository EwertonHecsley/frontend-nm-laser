import type { StateCreator } from "zustand";

import type { AppStore, SessionSlice } from "../types";

export const createSessionSlice: StateCreator<
  AppStore,
  [],
  [],
  SessionSlice
> = (set, get) => ({
  user: null,

  setSessionUser(user) {
    const current = get().user;

    if (
      current?.id === user?.id &&
      current?.role === user?.role &&
      current?.email === user?.email
    ) {
      return;
    }

    set({
      user,
      status: user ? "authenticated" : "unauthenticated",
      error: null,
    });
  },

  clearSession() {
    set({
      user: null,
      status: "unauthenticated",
      error: null,
    });
  },

  hasRole(role) {
    return get().user?.role === role;
  },
});
