import type { AuthUser, LoginInput, Role } from "@/types";

export type AuthStatus =
  | "idle"
  | "authenticating"
  | "authenticated"
  | "unauthenticated";

export interface AuthSlice {
  status: AuthStatus;
  error: string | null;
  login: (
    input: LoginInput,
    options?: { signal?: AbortSignal },
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export interface SessionSlice {
  user: AuthUser | null;
  setSessionUser: (user: AuthUser | null) => void;
  clearSession: () => void;
  hasRole: (role: Role) => boolean;
}

export interface UISlice {
  mobileNavOpen: boolean;
  sidebarCollapsed: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  toggleSidebar: () => void;
}

export interface AppointmentPeriodFilter {
  from: string;
  to: string;
}

export interface FiltersSlice {
  selectedCityId: string | null;
  appointmentPeriod: AppointmentPeriodFilter;
  setSelectedCityId: (cityId: string | null) => void;
  setAppointmentPeriod: (period: AppointmentPeriodFilter) => void;
  resetFilters: () => void;
}

export type AppStore = AuthSlice &
  SessionSlice &
  UISlice &
  FiltersSlice;
