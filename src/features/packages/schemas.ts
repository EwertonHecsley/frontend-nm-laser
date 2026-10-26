import { z } from "zod";

const moneyPattern = /^\d{1,9}([.,]\d{1,2})?$/;

export const packageItemFormSchema = z.object({
  areaId: z.string().min(1, "Selecione a área."),
  sessionsCount: z
    .number({ error: "Informe a quantidade de sessões." })
    .int("Informe um número inteiro.")
    .min(1, "Mínimo de 1 sessão.")
    .max(999, "Máximo de 999 sessões."),
  price: z
    .string()
    .trim()
    .min(1, "Informe o preço da área.")
    .max(40, "O preço deve ter no máximo 40 caracteres.")
    .refine((value) => moneyPattern.test(value), "Informe um preço válido.")
    .transform((value) => value.replace(",", ".")),
});

export const packageFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome do pacote.")
      .max(120, "O nome deve ter no máximo 120 caracteres."),
    maxDiscountPercent: z
      .number({ error: "Informe o desconto máximo permitido." })
      .min(0, "O desconto máximo não pode ser negativo.")
      .max(100, "O desconto máximo não pode passar de 100%."),
    items: z
      .array(packageItemFormSchema)
      .min(1, "Adicione ao menos uma área ao pacote."),
  })
  .superRefine((values, ctx) => {
    const seen = new Set<string>();

    values.items.forEach((item, index) => {
      if (!item.areaId) {
        return;
      }

      if (seen.has(item.areaId)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "areaId"],
          message: "Esta área já foi adicionada.",
        });
      }

      seen.add(item.areaId);
    });
  });

export type PackageFormValues = z.infer<typeof packageFormSchema>;
