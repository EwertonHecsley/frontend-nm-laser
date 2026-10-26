import { http } from "@/lib/http/client";
import { sanitizeSingleLine } from "@/lib/security/sanitize";
import type {
  CreateSaleInput,
  Sale,
  UpdateSaleInput,
} from "@/types";

function toCreatePayload(input: CreateSaleInput) {
  return {
    patientId: input.patientId,
    packageId: input.packageId,
    ...(input.consultantId ? { consultantId: input.consultantId } : {}),
    value: sanitizeSingleLine(input.value, 40),
    ...(input.discount ? { discount: sanitizeSingleLine(input.discount, 40) } : {}),
  };
}

function toUpdatePayload(input: UpdateSaleInput) {
  return {
    ...(input.consultantId !== undefined
      ? { consultantId: input.consultantId || null }
      : {}),
    ...(input.value !== undefined
      ? { value: sanitizeSingleLine(input.value, 40) }
      : {}),
    ...(input.discount !== undefined
      ? { discount: input.discount ? sanitizeSingleLine(input.discount, 40) : null }
      : {}),
  };
}

export const salesService = {
  listByPatient(patientId: string, options?: { signal?: AbortSignal }) {
    return http.get<Sale[]>("sales", {
      query: { patientId },
      signal: options?.signal,
    });
  },

  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<Sale>(`sales/${encodeURIComponent(id)}`, {
      signal: options?.signal,
    });
  },

  create(input: CreateSaleInput) {
    return http.post<Sale>("sales", toCreatePayload(input));
  },

  update(id: string, input: UpdateSaleInput) {
    return http.patch<Sale>(
      `sales/${encodeURIComponent(id)}`,
      toUpdatePayload(input),
    );
  },
};
