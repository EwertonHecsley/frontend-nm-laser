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

export const changePasswordFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Informe sua senha atual.")
      .max(200, "Senha muito longa."),
    newPassword: z
      .string()
      .min(8, "A nova senha deve ter pelo menos 8 caracteres.")
      .max(200, "Senha muito longa."),
    confirmPassword: z
      .string()
      .min(1, "Confirme a nova senha.")
      .max(200, "Senha muito longa."),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ["newPassword"],
    message: "A nova senha deve ser diferente da senha atual.",
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export type ChangePasswordFormValues = z.infer<
  typeof changePasswordFormSchema
>;
