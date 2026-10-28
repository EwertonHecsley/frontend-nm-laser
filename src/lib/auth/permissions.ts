import type { Role } from "@/types";

export type Permission =
  | "cities:read"
  | "cities:manage"
  | "patients:read"
  | "patients:write"
  | "patients:delete"
  | "appointments:read"
  | "appointments:write"
  | "appointments:delete"
  | "sessions:read"
  | "sessions:write"
  | "sessions:delete"
  | "catalog:manage"
  | "sales:write"
  | "sales:delete"
  | "users:read"
  | "users:manage";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  gestora: [
    "cities:read",
    "cities:manage",
    "patients:read",
    "patients:write",
    "patients:delete",
    "appointments:read",
    "appointments:write",
    "appointments:delete",
    "sessions:read",
    "sessions:write",
    "sessions:delete",
    "catalog:manage",
    "sales:write",
    "sales:delete",
    "users:read",
    "users:manage",
  ],
  vendas: [
    "cities:read",
    "patients:read",
    "appointments:read",
    "appointments:write",
    "appointments:delete",
    "sessions:read",
    "sales:write",
  ],
  aplicadora: [
    "cities:read",
    "patients:read",
    "appointments:read",
    "appointments:write",
    "appointments:delete",
    "sessions:read",
    "sessions:write",
  ],
};

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  if (!role) {
    return false;
  }

  return ROLE_PERMISSIONS[role].includes(permission);
}
