import { z } from "zod";

import { APPOINTMENT_STATUSES } from "@/types";

import { isUuid } from "./utils";

export const appointmentFormSchema = z.object({
  patientId: z.string().min(1, "Selecione a paciente."),
  cityId: z.string().min(1, "Selecione a cidade."),
  professionalId: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isUuid(value),
      "Informe um UUID de profissional válido.",
    ),
  scheduledAt: z
    .string()
    .min(1, "Informe a data e hora.")
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Informe uma data e hora válidas.",
    ),
  status: z.enum(APPOINTMENT_STATUSES),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
