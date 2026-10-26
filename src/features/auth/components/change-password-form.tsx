"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from "@/features/auth/schemas";
import { ApiError, getErrorMessage } from "@/lib/http/errors";
import { authService } from "@/services";

type PasswordField = "current" | "next" | "confirm";

function VisibilityToggle({
  visible,
  onToggle,
  label,
}: {
  visible: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="absolute right-1.5 top-1/2 -translate-y-1/2"
      onClick={onToggle}
      aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
      aria-pressed={visible}
    >
      {visible ? (
        <EyeOff className="size-4" />
      ) : (
        <Eye className="size-4" />
      )}
    </Button>
  );
}

export function ChangePasswordForm() {
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    current: false,
    next: false,
    confirm: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  function toggleVisibility(field: PasswordField) {
    setVisible((current) => ({ ...current, [field]: !current[field] }));
  }

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      reset();
      toast.success("Senha alterada com sucesso.");
    } catch (error) {
      const message = getErrorMessage(error);

      if (error instanceof ApiError && error.status === 400) {
        const field = message.toLowerCase().includes("nova senha")
          ? "newPassword"
          : "currentPassword";

        setError(field, { message });
      } else {
        setError("root", { message });
      }

      toast.error(message);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Alterar senha</CardTitle>
        <CardDescription>
          Informe sua senha atual e defina uma nova senha de acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <Field data-invalid={Boolean(errors.currentPassword)}>
            <FieldLabel htmlFor="current-password">Senha atual</FieldLabel>
            <div className="relative">
              <Input
                id="current-password"
                type={visible.current ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Sua senha atual"
                className="h-11 pr-11"
                aria-invalid={Boolean(errors.currentPassword)}
                {...register("currentPassword")}
              />
              <VisibilityToggle
                visible={visible.current}
                onToggle={() => toggleVisibility("current")}
                label="senha atual"
              />
            </div>
            <FieldError errors={[errors.currentPassword]} />
          </Field>

          <Field data-invalid={Boolean(errors.newPassword)}>
            <FieldLabel htmlFor="new-password">Nova senha</FieldLabel>
            <div className="relative">
              <Input
                id="new-password"
                type={visible.next ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo de 8 caracteres"
                className="h-11 pr-11"
                aria-invalid={Boolean(errors.newPassword)}
                {...register("newPassword")}
              />
              <VisibilityToggle
                visible={visible.next}
                onToggle={() => toggleVisibility("next")}
                label="nova senha"
              />
            </div>
            <FieldError errors={[errors.newPassword]} />
            <FieldDescription>
              Use pelo menos 8 caracteres e não repita a senha atual.
            </FieldDescription>
          </Field>

          <Field data-invalid={Boolean(errors.confirmPassword)}>
            <FieldLabel htmlFor="confirm-password">
              Confirmar nova senha
            </FieldLabel>
            <div className="relative">
              <Input
                id="confirm-password"
                type={visible.confirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                className="h-11 pr-11"
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register("confirmPassword")}
              />
              <VisibilityToggle
                visible={visible.confirm}
                onToggle={() => toggleVisibility("confirm")}
                label="confirmação da nova senha"
              />
            </div>
            <FieldError errors={[errors.confirmPassword]} />
          </Field>

          {errors.root?.message && (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {errors.root.message}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              {isSubmitting ? "Alterando…" : "Alterar senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
