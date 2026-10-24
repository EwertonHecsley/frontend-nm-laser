"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
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
  FieldGroup,
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
import { Textarea } from "@/components/ui/textarea";
import {
  patientCreateSchema,
  patientEditSchema,
  type PatientFormValues,
} from "@/features/patients/schemas";
import { useApiQuery } from "@/hooks";
import { toDateOnlyInputValue } from "@/lib/format/date";
import { ApiError, getErrorMessage } from "@/lib/http/errors";
import { citiesService, patientsService } from "@/services";

interface PatientFormProps {
  mode: "create" | "edit";
  patientId?: string;
}

function getMutationError(error: unknown, isEdit: boolean): string {
  if (error instanceof ApiError && error.status === 409) {
    return isEdit
      ? "Já existe um registro com estes dados."
      : "Já existe um paciente cadastrado com este CPF.";
  }

  return getErrorMessage(error);
}

export function PatientForm({ mode, patientId = "" }: PatientFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    data: patient,
    error: patientError,
    isLoading: isLoadingPatient,
    refetch: refetchPatient,
  } = useApiQuery(
    (signal) => patientsService.getById(patientId, { signal }),
    `patient:${patientId}`,
    { enabled: isEdit },
  );

  const {
    data: cities,
    error: citiesError,
    isLoading: isLoadingCities,
    refetch: refetchCities,
  } = useApiQuery((signal) => citiesService.list({ signal }), "cities");

  const cityOptions = useMemo(
    () =>
      [...(cities ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
    [cities],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(isEdit ? patientEditSchema : patientCreateSchema),
    defaultValues: {
      fullName: "",
      birthDate: "",
      cpf: "",
      address: "",
      cityId: "",
      whatsapp: "",
    },
  });

  useEffect(() => {
    if (patient) {
      reset({
        fullName: patient.fullName,
        birthDate: toDateOnlyInputValue(patient.birthDate),
        cpf: patient.cpf,
        address: patient.address,
        cityId: patient.cityId,
        whatsapp: patient.whatsapp ?? "",
      });
    }
  }, [patient, reset]);

  async function onSubmit(values: PatientFormValues) {
    const toastId = toast.loading(
      isEdit ? "Salvando alterações…" : "Cadastrando paciente…",
    );

    try {
      if (isEdit) {
        await patientsService.update(patientId, {
          fullName: values.fullName,
          birthDate: values.birthDate,
          address: values.address,
          cityId: values.cityId,
          whatsapp: values.whatsapp,
        });
        toast.success("Paciente atualizado.", { id: toastId });
      } else {
        await patientsService.create({
          fullName: values.fullName,
          birthDate: values.birthDate,
          cpf: values.cpf,
          address: values.address,
          cityId: values.cityId,
          whatsapp: values.whatsapp || undefined,
        });
        toast.success("Paciente cadastrado.", { id: toastId });
      }

      router.push("/patients");
      router.refresh();
    } catch (error) {
      const message = getMutationError(error, isEdit);
      setError("root", { message });
      toast.error(message, { id: toastId });
    }
  }

  if (isEdit && isLoadingPatient) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-11 sm:col-span-2" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-20 sm:col-span-2" />
        </CardContent>
      </Card>
    );
  }

  if (isEdit && patientError) {
    return (
      <Alert variant="destructive" className="max-w-3xl">
        <AlertTriangle className="size-4" />
        <AlertTitle>Não foi possível carregar o paciente</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{patientError}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={refetchPatient}>
              Tentar novamente
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/patients">Voltar</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>
          {isEdit ? "Dados do paciente" : "Cadastrar paciente"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Atualize os dados cadastrais. O CPF não pode ser alterado."
            : "Preencha os dados obrigatórios para iniciar o acompanhamento."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.fullName)}
            >
              <FieldLabel htmlFor="fullName">Nome completo</FieldLabel>
              <Input
                id="fullName"
                autoFocus
                autoComplete="name"
                maxLength={180}
                placeholder="Ex.: Maria Silva"
                className="h-11"
                aria-invalid={Boolean(errors.fullName)}
                {...register("fullName")}
              />
              <FieldError errors={[errors.fullName]} />
            </Field>

            <Field data-invalid={Boolean(errors.birthDate)}>
              <FieldLabel htmlFor="birthDate">Data de nascimento</FieldLabel>
              <Input
                id="birthDate"
                type="date"
                autoComplete="bday"
                className="h-11"
                aria-invalid={Boolean(errors.birthDate)}
                {...register("birthDate")}
              />
              <FieldError errors={[errors.birthDate]} />
            </Field>

            <Field data-invalid={Boolean(errors.cpf)}>
              <FieldLabel htmlFor="cpf">CPF</FieldLabel>
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                placeholder="000.000.000-00"
                className="h-11"
                disabled={isEdit}
                aria-invalid={Boolean(errors.cpf)}
                {...register("cpf")}
              />
              {errors.cpf ? (
                <FieldError errors={[errors.cpf]} />
              ) : (
                <FieldDescription>
                  {isEdit
                    ? "O CPF não pode ser alterado."
                    : "Obrigatório. A pontuação é removida automaticamente."}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.whatsapp)}>
              <FieldLabel htmlFor="whatsapp">WhatsApp</FieldLabel>
              <Input
                id="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={20}
                placeholder="(83) 99999-9999"
                className="h-11"
                aria-invalid={Boolean(errors.whatsapp)}
                {...register("whatsapp")}
              />
              {errors.whatsapp ? (
                <FieldError errors={[errors.whatsapp]} />
              ) : (
                <FieldDescription>
                  Opcional, com DDD. Somente números são enviados.
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.cityId)}>
              <FieldLabel htmlFor="cityId">Cidade</FieldLabel>
              <Controller
                control={control}
                name="cityId"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={isLoadingCities}
                  >
                    <SelectTrigger
                      id="cityId"
                      className="h-11 w-full"
                      aria-invalid={Boolean(errors.cityId)}
                    >
                      <SelectValue
                        placeholder={
                          isLoadingCities
                            ? "Carregando cidades…"
                            : "Selecione a cidade"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {cityOptions.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cityId ? (
                <FieldError errors={[errors.cityId]} />
              ) : (
                <FieldDescription>
                  Cidade onde o atendimento será realizado.
                </FieldDescription>
              )}
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.address)}
            >
              <FieldLabel htmlFor="address">Endereço</FieldLabel>
              <Textarea
                id="address"
                rows={3}
                autoComplete="street-address"
                maxLength={240}
                placeholder="Rua, número, bairro e complemento"
                aria-invalid={Boolean(errors.address)}
                {...register("address")}
              />
              <FieldError errors={[errors.address]} />
            </Field>
          </FieldGroup>

          {citiesError && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Não foi possível carregar as cidades</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{citiesError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={refetchCities}
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

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
              <Link href="/patients">
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
              {isSubmitting
                ? "Salvando…"
                : isEdit
                  ? "Salvar alterações"
                  : "Cadastrar paciente"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
