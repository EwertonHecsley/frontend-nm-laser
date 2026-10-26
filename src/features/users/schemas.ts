import { z } from "zod";

export function userFormSchema(isEdit: boolean) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Informe o nome do integrante.")
        .max(120, "O nome deve ter no máximo 120 caracteres."),
      email: z
        .string()
        .trim()
        .min(1, "Informe o e-mail.")
        .email("Informe um e-mail válido.")
        .max(254, "E-mail muito longo."),
      role: z.enum(["vendas", "aplicadora"], {
        message: "Selecione um perfil válido.",
      }),
      password: z.string().max(200, "Senha muito longa."),
    })
    .superRefine((values, ctx) => {
      if (!isEdit && values.password.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "A senha inicial deve ter pelo menos 8 caracteres.",
        });
      }

      if (
        isEdit &&
        values.password.length > 0 &&
        values.password.length < 8
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "A nova senha deve ter pelo menos 8 caracteres.",
        });
      }
    });
}

export type UserFormValues = z.infer<ReturnType<typeof userFormSchema>>;
