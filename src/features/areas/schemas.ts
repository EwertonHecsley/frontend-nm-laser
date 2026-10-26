import { z } from "zod";

export const areaFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da área.")
    .max(120, "O nome deve ter no máximo 120 caracteres."),
});

export type AreaFormValues = z.infer<typeof areaFormSchema>;
