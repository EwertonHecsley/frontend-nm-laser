import type { AuditFields } from "./common";

export type SessionStatus = "completed" | "in_progress" | "cancelled";

export interface SessionRecord extends AuditFields {
  appointmentId: string | null;
  patientId: string;
  sessionNumber: string;
  performedAt: string;
  applicatorId: string | null;
  potency: string | null;
  frequency: string | null;
  technique: string | null;
  energyAccumulated: string | null;
  observations: string | null;
  signature: string | null;
  status: SessionStatus | string;
}

export interface CreateSessionInput {
  appointmentId?: string;
  patientId: string;
  sessionNumber: string;
  performedAt: string;
  applicatorId?: string;
  potency?: string;
  frequency?: string;
  technique?: string;
  energyAccumulated?: string;
  observations?: string;
  signature?: string;
  status?: SessionStatus | string;
}

export interface UpdateSessionInput {
  appointmentId?: string | null;
  sessionNumber?: string;
  performedAt?: string;
  applicatorId?: string | null;
  potency?: string | null;
  frequency?: string | null;
  technique?: string | null;
  energyAccumulated?: string | null;
  observations?: string | null;
  signature?: string | null;
  status?: SessionStatus | string;
}

