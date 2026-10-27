import { http } from "@/lib/http/client";
import {
  sanitizeEmail,
  sanitizeSingleLine,
  uppercaseText,
} from "@/lib/security/sanitize";
import type {
  CreateUserInput,
  ManagedUser,
  UpdateUserInput,
} from "@/types";

function toUserPayload(input: CreateUserInput | UpdateUserInput) {
  return {
    ...(input.name !== undefined
      ? { name: sanitizeSingleLine(uppercaseText(input.name), 120) }
      : {}),
    ...(input.email !== undefined
      ? { email: sanitizeEmail(input.email) }
      : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.password ? { password: input.password } : {}),
  };
}

export const usersService = {
  list(options?: { signal?: AbortSignal }) {
    return http.get<ManagedUser[]>("users", { signal: options?.signal });
  },

  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<ManagedUser>(`users/${encodeURIComponent(id)}`, {
      signal: options?.signal,
    });
  },

  create(input: CreateUserInput) {
    return http.post<ManagedUser>("users", toUserPayload(input));
  },

  update(id: string, input: UpdateUserInput) {
    return http.patch<ManagedUser>(
      `users/${encodeURIComponent(id)}`,
      toUserPayload(input),
    );
  },

  remove(id: string) {
    return http.delete(`users/${encodeURIComponent(id)}`);
  },
};
