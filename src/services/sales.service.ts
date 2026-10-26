import { http } from "@/lib/http/client";
import { sanitizeSingleLine } from "@/lib/security/sanitize";
import type {
  CreateSaleInput,
  Sale,
  SaleConsultantSummary,
  SaleListFilters,
  SaleOpportunities,
  SaleSummary,
  UpdateSaleInput,
} from "@/types";

function toFiltersQuery(filters: SaleListFilters) {
  return {
    patientId: filters.patientId,
    cityId: filters.cityId,
    consultantId: filters.consultantId,
    from: filters.from,
    to: filters.to,
  };
}

function toCreatePayload(input: CreateSaleInput) {
  return {
    patientId: input.patientId,
    packageId: input.packageId,
    value: sanitizeSingleLine(input.value, 40),
    ...(input.discount
      ? { discount: sanitizeSingleLine(input.discount, 40) }
      : {}),
  };
}

function toUpdatePayload(input: UpdateSaleInput) {
  return {
    ...(input.value !== undefined
      ? { value: sanitizeSingleLine(input.value, 40) }
      : {}),
    ...(input.discount !== undefined
      ? {
          discount: input.discount
            ? sanitizeSingleLine(input.discount, 40)
            : null,
        }
      : {}),
  };
}

export const salesService = {
  list(filters: SaleListFilters = {}, options?: { signal?: AbortSignal }) {
    return http.get<Sale[]>("sales", {
      query: toFiltersQuery(filters),
      signal: options?.signal,
    });
  },

  listByPatient(patientId: string, options?: { signal?: AbortSignal }) {
    return this.list({ patientId }, options);
  },

  summary(filters: SaleListFilters = {}, options?: { signal?: AbortSignal }) {
    return http.get<SaleSummary>("sales/summary", {
      query: toFiltersQuery(filters),
      signal: options?.signal,
    });
  },

  consultants(options?: { signal?: AbortSignal }) {
    return http.get<SaleConsultantSummary[]>("sales/consultants", {
      signal: options?.signal,
    });
  },

  opportunities(options?: { signal?: AbortSignal }) {
    return http.get<SaleOpportunities>("sales/opportunities", {
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
