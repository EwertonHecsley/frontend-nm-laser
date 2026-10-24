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
