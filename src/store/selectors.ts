import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { AppStore } from "./types";

export const selectUser = (state: AppStore) => state.user;
export const selectRole = (state: AppStore) => state.user?.role ?? null;
export const selectAuthStatus = (state: AppStore) => state.status;
export const selectAuthError = (state: AppStore) => state.error;
export const selectIsAuthenticated = (state: AppStore) => state.user !== null;

export const selectMobileNavOpen = (state: AppStore) => state.mobileNavOpen;
export const selectSidebarCollapsed = (state: AppStore) =>
  state.sidebarCollapsed;

export const selectSelectedCityId = (state: AppStore) =>
  state.selectedCityId;
export const selectAppointmentPeriod = (state: AppStore) =>
  state.appointmentPeriod;

export function selectCan(permission: Permission) {
  return (state: AppStore) => hasPermission(state.user?.role, permission);
}
