import { http } from "@/lib/http/client";
import { sanitizeMultiline, sanitizeSingleLine } from "@/lib/security/sanitize";
import type { CreateSessionInput, SessionRecord } from "@/types";

function toCreatePayload(input: CreateSessionInput) {
  return {
    patientId: input.patientId,
    sessionNumber: sanitizeSingleLine(input.sessionNumber, 40),
    performedAt: input.performedAt,
    ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
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
};
