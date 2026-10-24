import type { SessionRecord, SessionStatus } from "@/types";

export const SESSION_STATUS_OPTIONS: readonly {
  value: SessionStatus;
  label: string;
}[] = [
  { value: "completed", label: "Concluída" },
  { value: "in_progress", label: "Em andamento" },
  { value: "cancelled", label: "Cancelada" },
] as const;

export const SESSION_STATUS_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  completed: "default",
  in_progress: "secondary",
  cancelled: "destructive",
};

export function getSessionStatusLabel(
  status: string | null | undefined,
): string {
  switch (status) {
    case "completed":
      return "Concluída";
    case "in_progress":
      return "Em andamento";
    case "cancelled":
      return "Cancelada";
    default:
      return status ? status : "Concluída";
  }
}

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

