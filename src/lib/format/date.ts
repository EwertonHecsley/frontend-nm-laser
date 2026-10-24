export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(date);
}

const DATE_ONLY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatDateOnly(value: string): string {
  const match = DATE_ONLY_PREFIX.exec(value);

  if (!match) {
    return "—";
  }

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function toDateOnlyInputValue(value: string): string {
  const match = DATE_ONLY_PREFIX.exec(value);

  if (!match) {
    return "";
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function toDateInputValue(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateTimeInputValue(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseLocalDateOnly(value: string): Date | null {
  const match = DATE_ONLY_PREFIX.exec(value);

  if (!match) {
    return null;
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

export function toStartOfDayIso(value: string): string | undefined {
  const date = parseLocalDateOnly(value);

  if (!date) {
    return undefined;
  }

  date.setHours(0, 0, 0, 0);

  return date.toISOString();
}

export function toEndOfDayIso(value: string): string | undefined {
  const date = parseLocalDateOnly(value);

  if (!date) {
    return undefined;
  }

  date.setHours(23, 59, 59, 999);

  return date.toISOString();
}
