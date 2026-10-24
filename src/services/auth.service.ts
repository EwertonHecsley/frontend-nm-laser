import { http } from "@/lib/http/client";
import { sanitizeEmail } from "@/lib/security/sanitize";
import type {
  AuthSessionResponse,
  AuthUser,
  LoginInput,
} from "@/types";

export const authService = {
  async login(
    input: LoginInput,
    options?: { signal?: AbortSignal },
  ): Promise<AuthUser> {
    const response = await http.post<AuthSessionResponse>(
      "api/auth/login",
      {
        email: sanitizeEmail(input.email),
        password: input.password,
      },
      { signal: options?.signal },
    );

    return response.user;
  },

  async logout(): Promise<void> {
    await http.post<void>("api/auth/logout");
  },

  async getSession(options?: { signal?: AbortSignal }): Promise<AuthUser> {
    const response = await http.get<AuthSessionResponse>("api/auth/session", {
      signal: options?.signal,
    });

    return response.user;
  },
};
