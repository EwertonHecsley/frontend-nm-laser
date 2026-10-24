import type { StateCreator } from "zustand";

import type { AppStore, FiltersSlice } from "../types";

const EMPTY_PERIOD = { from: "", to: "" };

export const createFiltersSlice: StateCreator<
  AppStore,
  [],
  [],
  FiltersSlice
> = (set) => ({
  selectedCityId: null,
  appointmentPeriod: EMPTY_PERIOD,

  setSelectedCityId(cityId) {
    set({ selectedCityId: cityId });
  },

  setAppointmentPeriod(period) {
    set({ appointmentPeriod: period });
  },

  resetFilters() {
    set({
      selectedCityId: null,
      appointmentPeriod: EMPTY_PERIOD,
    });
  },
});
