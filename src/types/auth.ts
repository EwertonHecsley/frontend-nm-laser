import type { Role } from "./common";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface AuthSessionResponse {
  user: AuthUser;
}
