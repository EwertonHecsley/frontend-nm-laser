import type { Role } from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  gestora: "Gestora",
  vendas: "Vendas",
  aplicadora: "Aplicadora",
};

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}
