"use client";

import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { selectRole, useAppStore } from "@/store";

/**
 * Conveniência de UI. A autorização efetiva continua sendo feita pela API.
 */
export function usePermission(permission: Permission): boolean {
  const role = useAppStore(selectRole);

  return hasPermission(role, permission);
}
