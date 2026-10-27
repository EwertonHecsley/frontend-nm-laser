import type {
  SessionGroupSummary,
  SessionOverviewItem,
  SessionRecord,
  SessionStatus,
} from "@/types";

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

export function sortSessionsByNumber(
  sessions: readonly SessionOverviewItem[],
): SessionOverviewItem[] {
  return [...sessions].sort(
    (a, b) =>
      a.sessionNumber.localeCompare(b.sessionNumber, "pt-BR", {
        numeric: true,
        sensitivity: "base",
      }) ||
      new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime(),
  );
}

export function shortId(value: string | null): string {
  return value ? `${value.slice(0, 8)}…` : "—";
}


export function groupSessionsByTreatment(
  sessions: readonly SessionOverviewItem[],
): SessionGroupSummary[] {
  const groups = new Map<string, SessionGroupSummary>();

  for (const session of sessions) {
    const key =
      session.sessionGroupId ?? `patient:${session.patientId}`;
    const existing = groups.get(key);

    if (existing) {
      existing.sessions.push(session);
      existing.total += 1;

      if (session.status === "in_progress") {
        existing.inProgress += 1;
      } else if (session.status === "cancelled") {
        existing.cancelled += 1;
      } else {
        existing.completed += 1;
      }

      if (
        !existing.lastPerformedAt ||
        new Date(session.performedAt).getTime() >
          new Date(existing.lastPerformedAt).getTime()
      ) {
        existing.lastPerformedAt = session.performedAt;
      }
      continue;
    }

    groups.set(key, {
      id: key,
      code: session.sessionGroupCode ?? "SEM-GRUPO",
      patientId: session.patientId,
      patient: session.patient,
      packageName: session.packageName,
      sessions: [session],
      total: 1,
      completed:
        session.status === "in_progress" || session.status === "cancelled"
          ? 0
          : 1,
      inProgress: session.status === "in_progress" ? 1 : 0,
      cancelled: session.status === "cancelled" ? 1 : 0,
      lastPerformedAt: session.performedAt,
    });
  }

  return [...groups.values()].sort(
    (a, b) =>
      new Date(b.lastPerformedAt ?? 0).getTime() -
      new Date(a.lastPerformedAt ?? 0).getTime(),
  );
}
