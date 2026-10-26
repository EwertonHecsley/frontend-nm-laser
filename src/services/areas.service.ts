import { http } from "@/lib/http/client";
import {
  sanitizeSingleLine,
  uppercaseText,
} from "@/lib/security/sanitize";
import type { Area, CreateAreaInput, UpdateAreaInput } from "@/types";

function toAreaPayload(input: CreateAreaInput | UpdateAreaInput) {
  return { name: sanitizeSingleLine(uppercaseText(input.name ?? ""), 120) };
}

export const areasService = {
  list(options?: { signal?: AbortSignal }) {
    return http.get<Area[]>("areas", { signal: options?.signal });
  },

  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<Area>(`areas/${encodeURIComponent(id)}`, {
      signal: options?.signal,
    });
  },

  create(input: CreateAreaInput) {
    return http.post<Area>("areas", toAreaPayload(input));
  },

  update(id: string, input: UpdateAreaInput) {
    return http.patch<Area>(
      `areas/${encodeURIComponent(id)}`,
      toAreaPayload(input),
    );
  },
};
