import type { AuditFields } from "./common";

export const PAYMENT_METHODS = [
  "especie",
  "pix",
  "cartao_credito",
  "cartao_debito",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SALE_PAYMENT_STATUSES = ["open", "confirmed"] as const;

export type SalePaymentStatus = (typeof SALE_PAYMENT_STATUSES)[number];

export interface SaleAreaBalance {
  areaId: string;
  areaName: string;
  sessionsCount: number;
  price: string;
  used: number;
  remaining: number;
}

export interface SalePackageSummary {
  id: string;
  name: string;
  sessionsCount: number;
  price: string;
  maxDiscountPercent: number;
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
  paymentMethod: PaymentMethod;
  paymentStatus: SalePaymentStatus;
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
  packageId?: string;
  paymentMethod?: PaymentMethod;
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
  paymentMethod: PaymentMethod;
}

export interface UpdateSaleInput {
  value?: string;
  discount?: string | null;
  paymentMethod?: PaymentMethod;
  paymentStatus?: SalePaymentStatus;
}

export interface SaleOpportunityArea {
  areaId: string;
  areaName: string;
  sessionsCount: number;
  used: number;
  remaining: number;
}

export interface SaleOpportunityPackage {
  id: string;
  name: string;
  sessionsCount: number;
}

export interface SaleOpportunity {
  saleId: string;
  purchasedAt: string;
  patient: SalePatientSummary;
  city: SaleCitySummary | null;
  package: SaleOpportunityPackage | null;
  sessionsCount: number;
  used: number;
  remaining: number;
  started: boolean;
  areas: SaleOpportunityArea[];
}

export interface SaleOpportunitiesStats {
  patientsCount: number;
  activePatientsCount: number;
  notStartedPatientsCount: number;
  inProgressPatientsCount: number;
  packagesCount: number;
  activePackagesCount: number;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  pendingSessions: number;
}

export interface SaleOpportunities {
  stats: SaleOpportunitiesStats;
  packages: SaleOpportunity[];
}
