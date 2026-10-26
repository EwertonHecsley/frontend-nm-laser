import { http } from "@/lib/http/client";
import {
  sanitizeSingleLine,
  uppercaseText,
} from "@/lib/security/sanitize";
import type { City, CreateCityInput, UpdateCityInput } from "@/types";

function toCityPayload(input: CreateCityInput | UpdateCityInput) {
  return { name: sanitizeSingleLine(uppercaseText(input.name), 120) };
}

export const citiesService = {
  list(options?: { signal?: AbortSignal }) {
    return http.get<City[]>("cities", { signal: options?.signal });
  },

  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<City>(`cities/${encodeURIComponent(id)}`, {
      signal: options?.signal,
    });
  },

  create(input: CreateCityInput) {
    return http.post<City>("cities", toCityPayload(input));
  },

  update(id: string, input: UpdateCityInput) {
    return http.patch<City>(`cities/${encodeURIComponent(id)}`, toCityPayload(input));
  },

  remove(id: string) {
    return http.delete(`cities/${encodeURIComponent(id)}`);
  },
};
