import { z } from "zod";

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido.")
    .max(254, "E-mail muito longo."),
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .max(200, "Senha muito longa."),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
