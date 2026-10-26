import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from "@/types";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  arrived: "Chegou",
  performed: "Realizado",
  missed: "Faltou",
  rescheduled: "Remarcado",
  cancelled: "Cancelado",
};

export const APPOINTMENT_STATUS_BADGE_VARIANTS: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "secondary",
  arrived: "default",
  performed: "default",
  missed: "destructive",
  rescheduled: "outline",
  cancelled: "destructive",
};

export const APPOINTMENT_STATUS_OPTIONS = APPOINTMENT_STATUSES.map(
  (status) => ({
    value: status,
    label: APPOINTMENT_STATUS_LABELS[status],
  }),
);

export function getAppointmentStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABELS[status];
}

export type AppointmentProximity = "normal" | "tomorrow" | "today";

const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "scheduled",
  "arrived",
  "rescheduled",
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toLocalDayIndex(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isAppointmentConfirmable(status: AppointmentStatus): boolean {
  return ACTIVE_APPOINTMENT_STATUSES.includes(status);
}

export function getAppointmentProximity(
  scheduledAt: string,
  status: AppointmentStatus,
  reference: Date = new Date(),
): AppointmentProximity | null {
  if (!isAppointmentConfirmable(status)) {
    return null;
  }

  const scheduledDate = new Date(scheduledAt);

  if (Number.isNaN(scheduledDate.getTime())) {
    return null;
  }

  const differenceInDays = Math.round(
    (toLocalDayIndex(scheduledDate) - toLocalDayIndex(reference)) / DAY_IN_MS,
  );

  if (differenceInDays < 0) {
    return null;
  }

  if (differenceInDays === 0) {
    return "today";
  }

  if (differenceInDays === 1) {
    return "tomorrow";
  }

  return "normal";
}
