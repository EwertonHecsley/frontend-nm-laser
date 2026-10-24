import type { StateCreator } from "zustand";

import type { AppStore, UISlice } from "../types";

export const createUISlice: StateCreator<AppStore, [], [], UISlice> = (set) => ({
  mobileNavOpen: false,
  sidebarCollapsed: false,

  setMobileNavOpen(open) {
    set({ mobileNavOpen: open });
  },

  toggleMobileNav() {
    set((state) => ({ mobileNavOpen: !state.mobileNavOpen }));
  },

  toggleSidebar() {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },
});
