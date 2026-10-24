import { http } from "@/lib/http/client";
import {
  onlyDigits,
  sanitizeSingleLine,
  sanitizeText,
} from "@/lib/security/sanitize";
import type {
  CreatePatientInput,
  PaginatedResponse,
  Patient,
  PatientListParams,
  UpdatePatientInput,
} from "@/types";

function toCreatePayload(input: CreatePatientInput) {
  const whatsapp = input.whatsapp ? onlyDigits(input.whatsapp) : "";

  return {
    fullName: sanitizeSingleLine(input.fullName, 180),
    birthDate: input.birthDate,
    cpf: onlyDigits(input.cpf),
    address: sanitizeText(input.address).slice(0, 240),
    cityId: input.cityId,
    ...(whatsapp ? { whatsapp } : {}),
  };
}

function toUpdatePayload(input: UpdatePatientInput) {
  return {
    ...(input.fullName !== undefined
      ? { fullName: sanitizeSingleLine(input.fullName, 180) }
      : {}),
    ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}),
    ...(input.address !== undefined
      ? { address: sanitizeText(input.address).slice(0, 240) }
      : {}),
    ...(input.cityId !== undefined ? { cityId: input.cityId } : {}),
    ...(input.whatsapp !== undefined
      ? { whatsapp: onlyDigits(input.whatsapp) }
      : {}),
  };
}

export const patientsService = {
  list(
    params: PatientListParams = {},
    options?: { signal?: AbortSignal },
  ) {
    return http.get<PaginatedResponse<Patient>>("patients", {
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        search: params.search,
      },
      signal: options?.signal,
    });
  },

  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<Patient>(`patients/${encodeURIComponent(id)}`, {
      signal: options?.signal,
    });
  },

  create(input: CreatePatientInput) {
    return http.post<Patient>("patients", toCreatePayload(input));
  },

  /** O backend rejeita `cpf` no PATCH; o payload nunca inclui esse campo. */
  update(id: string, input: UpdatePatientInput) {
    return http.patch<Patient>(
      `patients/${encodeURIComponent(id)}`,
      toUpdatePayload(input),
    );
  },

  remove(id: string) {
    return http.delete(`patients/${encodeURIComponent(id)}`);
  },
};
