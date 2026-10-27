import { http } from "@/lib/http/client";
import type {
  Appointment,
  AppointmentFilters,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@/types";

function toCreatePayload(input: CreateAppointmentInput) {
  return {
    patientId: input.patientId,
    cityId: input.cityId,
    scheduledAt: input.scheduledAt,
    ...(input.professionalId
      ? { professionalId: input.professionalId }
      : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

function toUpdatePayload(input: UpdateAppointmentInput) {
  return {
    ...(input.patientId ? { patientId: input.patientId } : {}),
    ...(input.cityId ? { cityId: input.cityId } : {}),
    ...(input.professionalId
      ? { professionalId: input.professionalId }
      : {}),
    ...(input.scheduledAt ? { scheduledAt: input.scheduledAt } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
}

export const appointmentsService = {
  list(filters: AppointmentFilters = {}, options?: { signal?: AbortSignal }) {
    return http.get<Appointment[]>("appointments", {
      query: {
        from: filters.from,
        to: filters.to,
        cityId: filters.cityId,
        professionalId: filters.professionalId,
      },
      signal: options?.signal,
    });
  },

  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<Appointment>(`appointments/${encodeURIComponent(id)}`, {
      signal: options?.signal,
    });
  },

  create(input: CreateAppointmentInput) {
    return http.post<Appointment>("appointments", toCreatePayload(input));
  },

  update(id: string, input: UpdateAppointmentInput) {
    return http.patch<Appointment>(
      `appointments/${encodeURIComponent(id)}`,
      toUpdatePayload(input),
    );
  },

  remove(id: string) {
    return http.delete(`appointments/${encodeURIComponent(id)}`);
  },
};
