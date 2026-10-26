import { onlyDigits } from "@/lib/security/sanitize";

export function buildWhatsAppHref(
  whatsapp: string | null | undefined,
  message: string,
): string | null {
  const digits = onlyDigits(whatsapp ?? "");

  if (!digits) {
    return null;
  }

  const number = digits.startsWith("55") ? digits : `55${digits}`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
