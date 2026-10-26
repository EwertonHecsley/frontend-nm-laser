import type { AuditFields } from "./common";

export interface PackageItem {
  areaId: string;
  areaName: string;
  sessionsCount: number;
  price: string;
}

export interface LaserPackage extends AuditFields {
  name: string;
  sessionsCount: number;
  price: string;
  maxDiscountPercent: number;
  items: PackageItem[];
}

export interface PackageItemInput {
  areaId: string;
  sessionsCount: number;
  price: string;
}

export interface CreatePackageInput {
  name: string;
  maxDiscountPercent: number;
  items: PackageItemInput[];
}

export interface UpdatePackageInput {
  name?: string;
  maxDiscountPercent?: number;
  items?: PackageItemInput[];
}
