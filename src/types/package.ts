import type { AuditFields } from "./common";

export interface PackageItem {
  areaId: string;
  areaName: string;
  sessionsCount: number;
}

export interface LaserPackage extends AuditFields {
  name: string;
  sessionsCount: number;
  items: PackageItem[];
}

export interface PackageItemInput {
  areaId: string;
  sessionsCount: number;
}

export interface CreatePackageInput {
  name: string;
  items: PackageItemInput[];
}

export interface UpdatePackageInput {
  name?: string;
  items?: PackageItemInput[];
}
