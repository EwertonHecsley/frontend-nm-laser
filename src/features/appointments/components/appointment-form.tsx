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
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import {
  appointmentFormSchema,
  type AppointmentFormValues,
} from "@/features/appointments/schemas";
import { APPOINTMENT_STATUS_OPTIONS } from "@/features/appointments/utils";
import { useApiQuery } from "@/hooks";
import { toDateTimeInputValue } from "@/lib/format/date";
import { ApiError, getErrorMessage } from "@/lib/http/errors";
import { appointmentsService, citiesService } from "@/services";

interface AppointmentFormProps {
  mode: "create" | "edit";
  appointmentId?: string;
}

function getMutationError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "Já existe um agendamento para este profissional neste horário.";
  }

  return getErrorMessage(error);
}

export function AppointmentForm({
  mode,
  appointmentId = "",
}: AppointmentFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    data: appointment,
    error: appointmentError,
    isLoading: isLoadingAppointment,
    refetch: refetchAppointment,
  } = useApiQuery(
    (signal) => appointmentsService.getById(appointmentId, { signal }),
    `appointment:${appointmentId}`,
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
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      patientId: "",
      cityId: "",
      professionalId: "",
      scheduledAt: "",
      status: "scheduled",
    },
  });

  useEffect(() => {
    if (appointment) {
      reset({
        patientId: appointment.patientId,
        cityId: appointment.cityId,
        professionalId: appointment.professionalId ?? "",
        scheduledAt: toDateTimeInputValue(appointment.scheduledAt),
        status: appointment.status,
      });
    }
  }, [appointment, reset]);

  async function onSubmit(values: AppointmentFormValues) {
    const toastId = toast.loading(
      isEdit ? "Salvando alterações…" : "Agendando horário…",
    );

    const payload = {
      patientId: values.patientId,
      cityId: values.cityId,
      professionalId: values.professionalId.trim() || undefined,
      scheduledAt: new Date(values.scheduledAt).toISOString(),
      status: values.status,
    };

    try {
      if (isEdit) {
        await appointmentsService.update(appointmentId, payload);
        toast.success("Agendamento atualizado.", { id: toastId });
      } else {
        await appointmentsService.create(payload);
        toast.success("Agendamento criado.", { id: toastId });
      }

      router.push("/appointments");
      router.refresh();
    } catch (error) {
      const message = getMutationError(error);
      setError("root", { message });
      toast.error(message, { id: toastId });
    }
  }

  if (isEdit && isLoadingAppointment) {
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
          <Skeleton className="h-11 sm:col-span-2" />
        </CardContent>
      </Card>
    );
  }

  if (isEdit && appointmentError) {
    return (
      <Alert variant="destructive" className="max-w-3xl">
        <AlertTriangle className="size-4" />
        <AlertTitle>Não foi possível carregar o agendamento</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{appointmentError}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={refetchAppointment}>
              Tentar novamente
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/appointments">Voltar</Link>
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
          {isEdit ? "Dados do agendamento" : "Novo agendamento"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Atualize a paciente, o horário ou o status do atendimento."
            : "Escolha a paciente, a cidade e o horário do atendimento."}
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
              data-invalid={Boolean(errors.patientId)}
            >
              <FieldLabel htmlFor="patientId">Paciente</FieldLabel>
              <Controller
                control={control}
                name="patientId"
                render={({ field }) => (
                  <PatientCombobox
                    id="patientId"
                    value={field.value}
                    invalid={Boolean(errors.patientId)}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError errors={[errors.patientId]} />
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
              <FieldError errors={[errors.cityId]} />
            </Field>

            <Field data-invalid={Boolean(errors.scheduledAt)}>
              <FieldLabel htmlFor="scheduledAt">Data e hora</FieldLabel>
              <Input
                id="scheduledAt"
                type="datetime-local"
                className="h-11"
                aria-invalid={Boolean(errors.scheduledAt)}
                {...register("scheduledAt")}
              />
              <FieldError errors={[errors.scheduledAt]} />
            </Field>

            <Field data-invalid={Boolean(errors.status)}>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="status"
                      className="h-11 w-full"
                      aria-invalid={Boolean(errors.status)}
                    >
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.status]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.professionalId)}
            >
              <FieldLabel htmlFor="professionalId">
                Profissional (opcional)
              </FieldLabel>
              <Input
                id="professionalId"
                placeholder="UUID do profissional"
                autoComplete="off"
                className="h-11"
                aria-invalid={Boolean(errors.professionalId)}
                {...register("professionalId")}
              />
              {errors.professionalId ? (
                <FieldError errors={[errors.professionalId]} />
              ) : (
                <FieldDescription>
                  O backend não expõe listagem de usuários; informe o UUID do
                  profissional ou deixe em branco.
                </FieldDescription>
              )}
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
              <Link href="/appointments">
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
                  : "Agendar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
