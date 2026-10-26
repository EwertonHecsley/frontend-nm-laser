import { getRoleLabel } from "@/lib/auth/role-labels";
import type { SubordinateRole } from "@/types";

export const SUBORDINATE_ROLE_OPTIONS: readonly {
  value: SubordinateRole;
  label: string;
}[] = [
  { value: "vendas", label: getRoleLabel("vendas") },
  { value: "aplicadora", label: getRoleLabel("aplicadora") },
];
