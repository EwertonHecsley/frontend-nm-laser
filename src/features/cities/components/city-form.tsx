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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cityFormSchema,
  type CityFormValues,
} from "@/features/cities/schemas";
import { useApiQuery } from "@/hooks";
import { getErrorMessage } from "@/lib/http/errors";
import { sanitizeSingleLine } from "@/lib/security/sanitize";
import { citiesService } from "@/services";

interface CityFormProps {
  mode: "create" | "edit";
  cityId?: string;
}

export function CityForm({ mode, cityId = "" }: CityFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    data: city,
    error: loadError,
    isLoading: isLoadingCity,
    refetch,
  } = useApiQuery(
    (signal) => citiesService.getById(cityId, { signal }),
    `city:${cityId}`,
    { enabled: isEdit },
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CityFormValues>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (city) {
      reset({ name: city.name });
    }
  }, [city, reset]);

  async function onSubmit(values: CityFormValues) {
    const name = sanitizeSingleLine(values.name, 120);

    if (!name) {
      setError("name", { message: "Informe o nome da cidade." });
      return;
    }

    try {
      if (isEdit) {
        await citiesService.update(cityId, { name });
        toast.success("Cidade atualizada.");
      } else {
        await citiesService.create({ name });
        toast.success("Cidade cadastrada.");
      }

      router.push("/cities");
      router.refresh();
    } catch (error) {
      const message = getErrorMessage(error);
      setError("root", { message });
      toast.error(message);
    }
  }

  if (isEdit && isLoadingCity) {
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
        <AlertTitle>Não foi possível carregar a cidade</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{loadError}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={refetch}>
              Tentar novamente
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/cities">Voltar</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Dados da cidade" : "Cadastrar cidade"}</CardTitle>
        <CardDescription>
          O nome será exibido nos cadastros de pacientes e agendamentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="city-name">Nome da cidade</Label>
            <Input
              id="city-name"
              autoFocus
              maxLength={120}
              placeholder="Ex.: Patos"
              className="h-11"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={
                errors.name ? "city-name-error" : "city-name-help"
              }
              {...register("name")}
            />
            {errors.name ? (
              <p
                id="city-name-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {errors.name.message}
              </p>
            ) : (
              <p id="city-name-help" className="text-xs text-muted-foreground">
                Máximo de 120 caracteres.
              </p>
            )}
          </div>

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
              <Link href="/cities">
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
              {isSubmitting ? "Salvando…" : "Salvar cidade"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
