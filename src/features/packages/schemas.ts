import { z } from "zod";

export const packageItemFormSchema = z.object({
  areaId: z.string().min(1, "Selecione a área."),
  sessionsCount: z
    .number({ error: "Informe a quantidade de sessões." })
    .int("Informe um número inteiro.")
    .min(1, "Mínimo de 1 sessão.")
    .max(999, "Máximo de 999 sessões."),
});

export const packageFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome do pacote.")
      .max(120, "O nome deve ter no máximo 120 caracteres."),
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
