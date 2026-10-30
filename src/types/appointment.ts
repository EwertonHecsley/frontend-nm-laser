import type { AuditFields } from "./common";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "arrived",
  "performed",
  "missed",
  "rescheduled",
  "cancelled",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface Appointment extends AuditFields {
  patientId: string;
  cityId: string;
  professionalId: string | null;
  professionalName?: string | null;
  scheduledAt: string;
  status: AppointmentStatus;
}

export interface AppointmentFilters {
  from?: string;
  to?: string;
  cityId?: string;
  professionalId?: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  cityId: string;
  professionalId?: string;
  scheduledAt: string;
  status?: AppointmentStatus;
}

export type UpdateAppointmentInput = Partial<CreateAppointmentInput>;
