"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Save,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  userFormSchema,
  type UserFormValues,
} from "@/features/users/schemas";
import { SUBORDINATE_ROLE_OPTIONS } from "@/features/users/utils";
import { useApiQuery } from "@/hooks";
import { getErrorMessage } from "@/lib/http/errors";
import {
  sanitizeEmail,
  sanitizeSingleLine,
} from "@/lib/security/sanitize";
import { usersService } from "@/services";

interface UserFormProps {
  mode: "create" | "edit";
  userId?: string;
}

export function UserForm({ mode, userId = "" }: UserFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [showPassword, setShowPassword] = useState(false);

  const schema = useMemo(() => userFormSchema(isEdit), [isEdit]);

  const {
    data: member,
    error: loadError,
    isLoading: isLoadingMember,
    refetch,
  } = useApiQuery(
    (signal) => usersService.getById(userId, { signal }),
    `user:${userId}`,
    { enabled: isEdit },
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      role: "vendas",
      password: "",
    },
  });

  useEffect(() => {
    if (member) {
      reset({
        name: member.name,
        email: member.email,
        role: member.role,
        password: "",
      });
    }
  }, [member, reset]);

  async function onSubmit(values: UserFormValues) {
    const name = sanitizeSingleLine(values.name, 120);
    const email = sanitizeEmail(values.email);

    if (!name) {
      setError("name", { message: "Informe o nome do integrante." });
      return;
    }

    try {
      if (isEdit) {
        await usersService.update(userId, {
          name,
          email,
          role: values.role,
          ...(values.password ? { password: values.password } : {}),
        });
        toast.success("Integrante atualizado.");
      } else {
        await usersService.create({
          name,
          email,
          role: values.role,
          password: values.password,
        });
        toast.success("Integrante cadastrado.");
      }

      router.push("/users");
      router.refresh();
    } catch (error) {
      const message = getErrorMessage(error);
      setError("root", { message });
      toast.error(message);
    }
  }

  if (isEdit && isLoadingMember) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (isEdit && loadError) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertTriangle className="size-4" />
        <AlertTitle>Não foi possível carregar o integrante</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{loadError}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={refetch}>
              Tentar novamente
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/users">Voltar</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>
          {isEdit ? "Dados do integrante" : "Cadastrar integrante"}
        </CardTitle>
        <CardDescription>
          Aplicadoras, vendedores e demais subordinados acessam o CRM com o
          e-mail e a senha definidos aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="user-name">Nome completo</FieldLabel>
            <Input
              id="user-name"
              autoFocus
              maxLength={120}
              autoComplete="name"
              placeholder="Ex.: Maria Silva"
              className="h-11"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="user-email">E-mail</FieldLabel>
            <Input
              id="user-email"
              type="email"
              inputMode="email"
              maxLength={254}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nome@clinica.com"
              className="h-11"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
            <FieldDescription>
              Este e-mail será usado para entrar no sistema.
            </FieldDescription>
          </Field>

          <Field data-invalid={Boolean(errors.role)}>
            <FieldLabel htmlFor="user-role">Perfil</FieldLabel>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="user-role"
                    className="h-11 w-full"
                    aria-invalid={Boolean(errors.role)}
                  >
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBORDINATE_ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.role]} />
            <FieldDescription>
              Define quais áreas do CRM o integrante pode acessar.
            </FieldDescription>
          </Field>

          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="user-password">
              {isEdit ? "Nova senha (opcional)" : "Senha inicial"}
            </FieldLabel>
            <div className="relative">
              <Input
                id="user-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                maxLength={200}
                placeholder={
                  isEdit
                    ? "Deixe em branco para manter a senha atual"
                    : "Mínimo de 8 caracteres"
                }
                className="h-11 pr-11"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <FieldError errors={[errors.password]} />
            <FieldDescription>
              {isEdit
                ? "Preencha apenas se precisar redefinir a senha de acesso."
                : "Use pelo menos 8 caracteres."}
            </FieldDescription>
          </Field>

          {errors.root?.message && (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {errors.root.message}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href="/users">
                <ArrowLeft className="size-4" />
                Cancelar
              </Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEdit ? (
                <Save className="size-4" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {isSubmitting
                ? "Salvando…"
                : isEdit
                  ? "Salvar alterações"
                  : "Cadastrar integrante"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
