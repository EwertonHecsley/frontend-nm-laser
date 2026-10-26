import type { AuditFields } from "./common";

export type SessionStatus = "completed" | "in_progress" | "cancelled";

export interface SessionArea {
  id: string;
  name: string;
}

export interface SessionRecord extends AuditFields {
  appointmentId: string | null;
  saleId: string | null;
  patientId: string;
  areas: SessionArea[];
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
  saleId?: string;
  patientId: string;
  areaIds?: string[];
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
  saleId?: string | null;
  areaIds?: string[];
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

export interface SessionOverviewPatient {
  id: string;
  fullName: string;
}

export interface SessionOverviewItem extends SessionRecord {
  patient: SessionOverviewPatient;
  packageName: string | null;
}

export interface SessionOverviewStats {
  total: number;
  completed: number;
  inProgress: number;
  cancelled: number;
  patients: number;
}

export interface SessionOverviewFilters {
  patientId?: string;
  status?: SessionStatus | string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export interface SessionOverview {
  stats: SessionOverviewStats;
  sessions: SessionOverviewItem[];
}


