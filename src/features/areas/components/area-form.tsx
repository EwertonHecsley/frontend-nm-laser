"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  areaFormSchema,
  type AreaFormValues,
} from "@/features/areas/schemas";
import { useApiQuery } from "@/hooks";
import { getErrorMessage } from "@/lib/http/errors";
import { sanitizeSingleLine } from "@/lib/security/sanitize";
import { areasService } from "@/services";

interface AreaFormProps {
  mode: "create" | "edit";
  areaId?: string;
}

export function AreaForm({ mode, areaId = "" }: AreaFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    data: area,
    error: loadError,
    isLoading: isLoadingArea,
    refetch,
  } = useApiQuery(
    (signal) => areasService.getById(areaId, { signal }),
    `area:${areaId}`,
    { enabled: isEdit },
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (area) {
      reset({ name: area.name });
    }
  }, [area, reset]);

  async function onSubmit(values: AreaFormValues) {
    const name = sanitizeSingleLine(values.name, 120);

    if (!name) {
      setError("name", { message: "Informe o nome da área." });
      return;
    }

    try {
      if (isEdit) {
        await areasService.update(areaId, { name });
        toast.success("Área atualizada.");
      } else {
        await areasService.create({ name });
        toast.success("Área cadastrada.");
      }

      router.push("/areas");
      router.refresh();
    } catch (error) {
      const message = getErrorMessage(error);
      setError("root", { message });
      toast.error(message);
    }
  }

  if (isEdit && isLoadingArea) {
    return (
      <Card className="max-w-xl">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
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
        <AlertTitle>Não foi possível carregar a área</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{loadError}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={refetch}>
              Tentar novamente
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/areas">Voltar</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Dados da área" : "Cadastrar área"}</CardTitle>
        <CardDescription>
          Áreas são as regiões tratadas, como axila, buço, virilha e perna.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="area-name">Nome da área</FieldLabel>
            <Input
              id="area-name"
              autoFocus
              maxLength={120}
              placeholder="Ex.: Axila"
              className="h-11"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
            <FieldDescription>Máximo de 120 caracteres.</FieldDescription>
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
              <Link href="/areas">
                <ArrowLeft className="size-4" />
                Cancelar
              </Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSubmitting ? "Salvando…" : "Salvar área"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
