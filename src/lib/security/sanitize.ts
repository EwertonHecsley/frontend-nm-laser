const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Normaliza texto digitado, remove caracteres de controle e espaços nas
 * pontas. A saída continua sendo tratada como texto pelo React/JSON; nunca
 * deve ser injetada como HTML.
 */
export function sanitizeText(value: string): string {
  return value.normalize("NFC").replace(CONTROL_CHARACTERS, "").trim();
}

export function sanitizeEmail(value: string): string {
  return sanitizeText(value).toLowerCase();
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function sanitizeSingleLine(value: string, maxLength: number): string {
  return sanitizeText(value).replace(/\s+/g, " ").slice(0, maxLength);
}

export function sanitizeMultiline(value: string, maxLength: number): string {
  return sanitizeText(value).slice(0, maxLength);
}
