import type { SessionRecord } from "@/types";

export function sortSessionsByPerformedAt(
  sessions: readonly SessionRecord[],
): SessionRecord[] {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
  );
}

export function shortId(value: string | null): string {
  return value ? `${value.slice(0, 8)}…` : "—";
}
