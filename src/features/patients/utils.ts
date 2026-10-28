import { onlyDigits } from "@/lib/security/sanitize";

export function formatCpf(value: string | null | undefined): string {
  const digits = onlyDigits(value);

  if (digits.length !== 11) {
    return value?.trim() || "—";
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhone(value: string | null): string {
  const digits = onlyDigits(value ?? "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return value?.trim() || "—";
}
