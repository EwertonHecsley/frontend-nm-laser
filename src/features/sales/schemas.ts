import { z } from "zod";

const moneyPattern = /^\d{1,9}([.,]\d{1,2})?$/;

const money = z
  .string()
  .trim()
  .min(1, "Informe o valor da venda.")
  .max(40, "O valor deve ter no máximo 40 caracteres.")
  .refine((value) => moneyPattern.test(value), "Informe um valor válido.");

const optionalMoney = z
  .string()
  .trim()
  .max(40, "O desconto deve ter no máximo 40 caracteres.")
  .refine(
    (value) => value === "" || moneyPattern.test(value),
    "Informe um desconto válido.",
  );

export const saleFormSchema = z.object({
  patientId: z.string().min(1, "Selecione a paciente."),
  packageId: z.string().min(1, "Selecione o pacote."),
  value: money,
  discount: optionalMoney,
});

export type SaleFormValues = z.infer<typeof saleFormSchema>;
