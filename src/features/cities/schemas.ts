import { z } from "zod";

export const cityFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da cidade.")
    .max(120, "O nome deve ter no máximo 120 caracteres."),
});

export type CityFormValues = z.infer<typeof cityFormSchema>;
