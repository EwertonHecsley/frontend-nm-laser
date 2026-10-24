import { create } from "zustand";

import { createAuthSlice } from "./slices/auth-slice";
import { createFiltersSlice } from "./slices/filters-slice";
import { createSessionSlice } from "./slices/session-slice";
import { createUISlice } from "./slices/ui-slice";
import type { AppStore } from "./types";

/**
 * Store global dividida em slices. Use seletores atômicos para evitar
 * re-renders desnecessários (ex.: `useAppStore(selectUser)`).
 */
export const useAppStore = create<AppStore>()((...args) => ({
  ...createAuthSlice(...args),
  ...createSessionSlice(...args),
  ...createUISlice(...args),
  ...createFiltersSlice(...args),
}));

export * from "./selectors";
export type { AppStore } from "./types";
