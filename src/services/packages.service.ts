import { http } from "@/lib/http/client";
import {
  sanitizeSingleLine,
  uppercaseText,
} from "@/lib/security/sanitize";
import type {
  CreatePackageInput,
  LaserPackage,
  PackageItemInput,
  UpdatePackageInput,
} from "@/types";

function normalizeMoney(value: string): string {
  const amount = Number(value.replace(",", "."));

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function toItemsPayload(items: PackageItemInput[]) {
  return items.map((item) => ({
    areaId: item.areaId,
    sessionsCount: item.sessionsCount,
    price: normalizeMoney(item.price),
  }));
}

function toCreatePayload(input: CreatePackageInput) {
  return {
    name: sanitizeSingleLine(uppercaseText(input.name), 120),
    maxDiscountPercent: input.maxDiscountPercent,
    items: toItemsPayload(input.items),
  };
}

function toUpdatePayload(input: UpdatePackageInput) {
  return {
    ...(input.name !== undefined
      ? { name: sanitizeSingleLine(uppercaseText(input.name), 120) }
      : {}),
    ...(input.maxDiscountPercent !== undefined
      ? { maxDiscountPercent: input.maxDiscountPercent }
      : {}),
    ...(input.items !== undefined ? { items: toItemsPayload(input.items) } : {}),
  };
}

export const packagesService = {
  list(options?: { signal?: AbortSignal }) {
    return http.get<LaserPackage[]>("packages", { signal: options?.signal });
  },

  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<LaserPackage>(`packages/${encodeURIComponent(id)}`, {
      signal: options?.signal,
    });
  },

  create(input: CreatePackageInput) {
    return http.post<LaserPackage>("packages", toCreatePayload(input));
  },

  update(id: string, input: UpdatePackageInput) {
    return http.patch<LaserPackage>(
      `packages/${encodeURIComponent(id)}`,
      toUpdatePayload(input),
    );
  },
};
