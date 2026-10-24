import { z } from "zod";

import { isUuid } from "@/features/appointments/utils";

const optionalUuid = (message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || isUuid(value), message);

export const sessionFormSchema = z.object({
  patientId: z.string().min(1, "Selecione a paciente."),
  appointmentId: optionalUuid("Informe um UUID de agendamento válido."),
  sessionNumber: z
    .string()
    .trim()
    .min(1, "Informe o número da sessão.")
    .max(40, "O número da sessão deve ter no máximo 40 caracteres."),
  performedAt: z
    .string()
    .min(1, "Informe a data e hora da realização.")
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Informe uma data e hora válidas.",
    ),
  applicatorId: optionalUuid("Informe um UUID de aplicador válido."),
  potency: z
    .string()
    .trim()
    .max(80, "A potência deve ter no máximo 80 caracteres."),
  frequency: z
    .string()
    .trim()
    .max(80, "A frequência deve ter no máximo 80 caracteres."),
  technique: z
    .string()
    .trim()
    .max(120, "A técnica deve ter no máximo 120 caracteres."),
  energyAccumulated: z
    .string()
    .trim()
    .max(80, "A energia acumulada deve ter no máximo 80 caracteres."),
  observations: z
    .string()
    .trim()
    .max(2000, "As observações devem ter no máximo 2000 caracteres."),
  signature: z.string(),
});

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
