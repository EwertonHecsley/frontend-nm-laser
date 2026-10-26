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

export interface Sale extends AuditFields {
  patientId: string;
  packageId: string | null;
  consultantId: string | null;
  value: string;
  discount: string | null;
  package: SalePackageSummary | null;
  areas: SaleAreaBalance[];
}

export interface CreateSaleInput {
  patientId: string;
  packageId: string;
  consultantId?: string;
  value: string;
  discount?: string;
}

export interface UpdateSaleInput {
  consultantId?: string | null;
  value?: string;
  discount?: string | null;
}
