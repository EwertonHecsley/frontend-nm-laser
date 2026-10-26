import type { AuditFields } from "./common";

export interface SaleAreaBalance {
  areaId: string;
  areaName: string;
  sessionsCount: number;
  used: number;
  remaining: number;
}

export interface SalePackageSummary {
  id: string;
  name: string;
  sessionsCount: number;
}

export interface SalePatientSummary {
  id: string;
  fullName: string;
  whatsapp: string | null;
}

export interface SaleCitySummary {
  id: string;
  name: string;
}

export interface SaleConsultantSummary {
  id: string;
  name: string;
}

export interface Sale extends AuditFields {
  patientId: string;
  packageId: string | null;
  consultantId: string | null;
  value: string;
  discount: string | null;
  patient: SalePatientSummary | null;
  city: SaleCitySummary | null;
  consultant: SaleConsultantSummary | null;
  package: SalePackageSummary | null;
  areas: SaleAreaBalance[];
}

export interface SaleListFilters {
  patientId?: string;
  cityId?: string;
  consultantId?: string;
  from?: string;
  to?: string;
}

export interface SaleSummary {
  salesCount: number;
  totalValue: string;
  totalDiscount: string;
  revenue: string;
}

export interface CreateSaleInput {
  patientId: string;
  packageId: string;
  value: string;
  discount?: string;
}

export interface UpdateSaleInput {
  value?: string;
  discount?: string | null;
}
