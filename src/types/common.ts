export const ROLES = ["gestora", "vendas", "aplicadora"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

export interface AuditFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** O backend serializa `version` como string. */
  version: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[] | Record<string, unknown>;
  timestamp: string;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

export type Nullable<T> = T | null;
