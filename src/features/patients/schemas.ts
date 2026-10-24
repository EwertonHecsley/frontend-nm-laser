import { z } from "zod";

import { onlyDigits } from "@/lib/security/sanitize";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidBirthDate(value: string): boolean {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  return date.getTime() <= todayUtc;
}

const patientBaseSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe o nome completo.")
    .max(180, "O nome deve ter no máximo 180 caracteres."),
  birthDate: z
    .string()
    .min(1, "Informe a data de nascimento.")
    .refine(isValidBirthDate, "Informe uma data de nascimento válida."),
  address: z
    .string()
    .trim()
    .min(1, "Informe o endereço.")
    .max(240, "O endereço deve ter no máximo 240 caracteres."),
  cityId: z.string().min(1, "Selecione a cidade."),
  whatsapp: z
    .string()
    .trim()
    .refine((value) => {
      const digits = onlyDigits(value);

      return digits.length === 0 || digits.length === 10 || digits.length === 11;
    }, "Informe um WhatsApp com DDD (10 ou 11 dígitos)."),
});

export const patientCreateSchema = patientBaseSchema.extend({
  cpf: z
    .string()
    .trim()
    .min(1, "Informe o CPF.")
    .refine(
      (value) => onlyDigits(value).length === 11,
      "Informe um CPF com 11 dígitos.",
    ),
});

export const patientEditSchema = patientBaseSchema.extend({
  cpf: z.string(),
});

export type PatientFormValues = z.infer<typeof patientCreateSchema>;
