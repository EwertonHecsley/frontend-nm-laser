import { http } from "@/lib/http/client";
import { sanitizeMultiline, sanitizeSingleLine } from "@/lib/security/sanitize";
import type { CreateSessionInput, SessionRecord, UpdateSessionInput } from "@/types";

function toCreatePayload(input: CreateSessionInput) {
  return {
    patientId: input.patientId,
    sessionNumber: sanitizeSingleLine(input.sessionNumber, 40),
    performedAt: input.performedAt,
    ...(input.status ? { status: input.status } : { status: "completed" }),
    ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
    ...(input.saleId ? { saleId: input.saleId } : {}),
    ...(input.areaIds?.length
      ? { areaIds: [...new Set(input.areaIds)] }
      : {}),
    ...(input.applicatorId ? { applicatorId: input.applicatorId } : {}),
    ...(input.potency ? { potency: sanitizeSingleLine(input.potency, 80) } : {}),
    ...(input.frequency
      ? { frequency: sanitizeSingleLine(input.frequency, 80) }
      : {}),
    ...(input.technique
      ? { technique: sanitizeSingleLine(input.technique, 120) }
      : {}),
    ...(input.energyAccumulated
      ? { energyAccumulated: sanitizeSingleLine(input.energyAccumulated, 80) }
      : {}),
    ...(input.observations
      ? { observations: sanitizeMultiline(input.observations, 2000) }
      : {}),
    // A assinatura é opaca para o frontend; não alteramos seu conteúdo.
    ...(input.signature ? { signature: input.signature } : {}),
  };
}

function toUpdatePayload(input: UpdateSessionInput) {
  return {
    ...(input.sessionNumber !== undefined
      ? { sessionNumber: sanitizeSingleLine(input.sessionNumber, 40) }
      : {}),
    ...(input.performedAt !== undefined
      ? { performedAt: input.performedAt }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.appointmentId !== undefined
      ? { appointmentId: input.appointmentId || null }
      : {}),
    ...(input.saleId !== undefined
      ? { saleId: input.saleId || null }
      : {}),
    ...(input.areaIds !== undefined
      ? { areaIds: [...new Set(input.areaIds)] }
      : {}),
    ...(input.applicatorId !== undefined
      ? { applicatorId: input.applicatorId || null }
      : {}),
    ...(input.potency !== undefined
      ? {
          potency: input.potency
            ? sanitizeSingleLine(input.potency, 80)
            : null,
        }
      : {}),
    ...(input.frequency !== undefined
      ? {
          frequency: input.frequency
            ? sanitizeSingleLine(input.frequency, 80)
            : null,
        }
      : {}),
    ...(input.technique !== undefined
      ? {
          technique: input.technique
            ? sanitizeSingleLine(input.technique, 120)
            : null,
        }
      : {}),
    ...(input.energyAccumulated !== undefined
      ? {
          energyAccumulated: input.energyAccumulated
            ? sanitizeSingleLine(input.energyAccumulated, 80)
            : null,
        }
      : {}),
    ...(input.observations !== undefined
      ? {
          observations: input.observations
            ? sanitizeMultiline(input.observations, 2000)
            : null,
        }
      : {}),
    ...(input.signature !== undefined
      ? { signature: input.signature || null }
      : {}),
  };
}

export const sessionsService = {
  listByPatient(
    patientId: string,
    options?: { signal?: AbortSignal },
  ) {
    return http.get<SessionRecord[]>("sessions", {
      query: { patientId },
      signal: options?.signal,
    });
  },

  getById(id: string, options?: { signal?: AbortSignal }) {
    return http.get<SessionRecord>(`sessions/${encodeURIComponent(id)}`, {
      signal: options?.signal,
    });
  },

  create(input: CreateSessionInput) {
    return http.post<SessionRecord>("sessions", toCreatePayload(input));
  },

  update(id: string, input: UpdateSessionInput) {
    return http.patch<SessionRecord>(
      `sessions/${encodeURIComponent(id)}`,
      toUpdatePayload(input),
    );
  },
};

