import type { Role } from "./common";

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthSessionResponse {
  user: AuthUser;
}
