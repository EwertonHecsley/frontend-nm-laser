import type { StateCreator } from "zustand";

import { authService } from "@/services";
import { getErrorMessage, isAbortError } from "@/lib/http/errors";
import type { AppStore, AuthSlice } from "../types";

export const createAuthSlice: StateCreator<AppStore, [], [], AuthSlice> = (
  set,
  get,
) => ({
  status: "idle",
  error: null,

  async login(input, options) {
    set({ status: "authenticating", error: null });

    try {
      const user = await authService.login(input, options);
      get().setSessionUser(user);
      set({ status: "authenticated", error: null });

      return user;
    } catch (error) {
      if (isAbortError(error)) {
        set({ status: "idle" });
        throw error;
      }

      set({ status: "unauthenticated", error: getErrorMessage(error) });
      throw error;
    }
  },

  async logout() {
    try {
      await authService.logout();
    } catch {
      // O cookie é HttpOnly; se a chamada falhar, o próximo 401 encerra a
      // sessão no servidor. O estado local é limpo de qualquer forma.
    } finally {
      get().clearSession();
    }
  },
});
