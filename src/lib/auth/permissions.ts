import type { Role } from "@/types";

export type Permission =
  | "cities:read"
  | "cities:manage"
  | "patients:read"
  | "patients:write"
  | "patients:delete"
  | "appointments:read"
  | "appointments:write"
  | "sessions:read"
  | "sessions:write"
  | "catalog:manage"
  | "sales:write";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  gestora: [
    "cities:read",
    "cities:manage",
    "patients:read",
    "patients:write",
    "patients:delete",
    "appointments:read",
    "appointments:write",
    "sessions:read",
    "sessions:write",
    "catalog:manage",
    "sales:write",
  ],
  vendas: [
    "cities:read",
    "patients:read",
    "patients:write",
    "appointments:read",
    "appointments:write",
    "sessions:read",
    "sales:write",
  ],
  aplicadora: [
    "cities:read",
    "patients:read",
    "appointments:read",
    "appointments:write",
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
