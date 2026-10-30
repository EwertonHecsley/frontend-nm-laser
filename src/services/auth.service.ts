import { http } from "@/lib/http/client";
import { sanitizeEmail } from "@/lib/security/sanitize";
import type {
  AuthSessionResponse,
  AuthUser,
  ChangePasswordInput,
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

  async logout(options?: { signal?: AbortSignal }): Promise<void> {
    // O refresh token vive em cookie HttpOnly, gerenciado pelo servidor.
    await http.post<void>("api/auth/logout", undefined, options);
  },

  async changePassword(
    input: ChangePasswordInput,
    options?: { signal?: AbortSignal },
  ): Promise<{ message: string }> {
    return http.post<{ message: string }>(
      "api/auth/change-password",
      input,
      options,
    );
  },

  async refreshSession(
    options?: { signal?: AbortSignal },
  ): Promise<AuthUser | null> {
    try {
      const response = await http.post<AuthSessionResponse>(
        "api/auth/refresh",
        undefined,
        options,
      );

      return response.user;
    } catch {
      return null;
    }
  },
};
