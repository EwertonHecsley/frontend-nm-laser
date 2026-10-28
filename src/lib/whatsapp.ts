import { onlyDigits } from "./security/sanitize";

export function isValidWhatsAppNumber(
  whatsapp: string | null | undefined,
): boolean {
  const value = (whatsapp ?? "").trim();

  if (!value || !/^[+\d\s()./-]+$/.test(value)) {
    return false;
  }

  const digits = onlyDigits(value);
  const hasCountryCode =
    digits.startsWith("55") && (digits.length === 12 || digits.length === 13);
  const hasNationalNumber = digits.length === 10 || digits.length === 11;

  return hasCountryCode || hasNationalNumber;
}

export function buildWhatsAppHref(
  whatsapp: string | null | undefined,
  message: string,
): string | null {
  if (!isValidWhatsAppNumber(whatsapp)) {
    return null;
  }

  const digits = onlyDigits(whatsapp ?? "");
  const number =
    digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
      ? digits
      : `55${digits}`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
