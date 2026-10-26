"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import { getAppointmentStatusLabel } from "@/features/appointments/utils";
import { SessionPackageFields } from "@/features/sessions/components/session-package-fields";
import {
  sessionFormSchema,
  type SessionFormValues,
} from "@/features/sessions/schemas";
import { SESSION_STATUS_OPTIONS } from "@/features/sessions/utils";
import { useApiQuery } from "@/hooks";
import { formatDateTime, toDateTimeInputValue } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import {
  appointmentsService,
  salesService,
  sessionsService,
} from "@/services";

const NO_APPOINTMENT = "none";

interface SessionFormProps {
  initialPatientId?: string;
  canCreateSale?: boolean;
}

export function SessionForm({
  initialPatientId = "",
  canCreateSale = false,
}: SessionFormProps) {
  const router = useRouter();

  const {
    control,
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      patientId: initialPatientId,
      status: "completed",
      appointmentId: "",
      saleId: "",
      areaIds: [],
      sessionNumber: "1",
      performedAt: "",
      applicatorId: "",
      potency: "",
      frequency: "",
      technique: "",
      energyAccumulated: "",
      observations: "",
      signature: "",
    },
  });

  const selectedPatientId = useWatch({ control, name: "patientId" });
  const selectedSaleId = useWatch({ control, name: "saleId" });
  const selectedAreaIds = useWatch({ control, name: "areaIds" });

  const {
    data: appointments,
    isLoading: isLoadingAppointments,
  } = useApiQuery(
    (signal) => appointmentsService.list({}, { signal }),
    "session-appointments",
    { enabled: Boolean(selectedPatientId) },
  );

  const {
    data: sales,
    isLoading: isLoadingSales,
    error: salesError,
    refetch: refetchSales,
  } = useApiQuery(
    (signal) => salesService.listByPatient(selectedPatientId, { signal }),
    `session-sales:${selectedPatientId}`,
    { enabled: Boolean(selectedPatientId) },
  );

  const patientAppointments = useMemo(
    () =>
      [...(appointments ?? [])]
        .filter((appointment) => appointment.patientId === selectedPatientId)
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime(),
        ),
    [appointments, selectedPatientId],
  );

  useEffect(() => {
    setValue("performedAt", toDateTimeInputValue(new Date().toISOString()));
  }, [setValue]);

  async function onSubmit(values: SessionFormValues) {
    const toastId = toast.loading("Registrando sessão…");

    try {
      await sessionsService.create({
        patientId: values.patientId,
        status: values.status,
        sessionNumber: values.sessionNumber,
        performedAt: new Date(values.performedAt).toISOString(),
        appointmentId: values.appointmentId.trim() || undefined,
        saleId: values.saleId.trim() || undefined,
        areaIds: values.areaIds,
        applicatorId: values.applicatorId.trim() || undefined,
        potency: values.potency || undefined,
        frequency: values.frequency || undefined,
        technique: values.technique || undefined,
        energyAccumulated: values.energyAccumulated || undefined,
        observations: values.observations || undefined,
        signature: values.signature || undefined,
      });

      toast.success("Sessão registrada.", { id: toastId });
      router.push(
        `/sessions?patientId=${encodeURIComponent(values.patientId)}`,
      );
      router.refresh();
    } catch (error) {
      const message = getErrorMessage(error);
      setError("root", { message });
      toast.error(message, { id: toastId });
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Nova sessão</CardTitle>
        <CardDescription>
          Registre os parâmetros técnicos da aplicação realizada.
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
                    onChange={(patientId) => {
                      field.onChange(patientId);
                      setValue("appointmentId", "");
                      setValue("saleId", "");
                      setValue("areaIds", []);
                    }}
                  />
                )}
              />
              <FieldError errors={[errors.patientId]} />
            </Field>

            <SessionPackageFields
              idPrefix="session"
              saleId={selectedSaleId}
              areaIds={selectedAreaIds}
              sales={sales ?? []}
              patientSelected={Boolean(selectedPatientId)}
              isLoadingSales={isLoadingSales}
              salesError={salesError}
              saleError={errors.saleId?.message}
              areasError={errors.areaIds?.message}
              canCreateSale={canCreateSale}
              newSaleHref={
                selectedPatientId
                  ? `/sales/new?patientId=${encodeURIComponent(selectedPatientId)}`
                  : undefined
              }
              onRetrySales={refetchSales}
              onSaleChange={(saleId) => {
                setValue("saleId", saleId);
                setValue("areaIds", []);
              }}
              onAreasChange={(areaIds) => setValue("areaIds", areaIds)}
            />

            <Field data-invalid={Boolean(errors.sessionNumber)}>
              <FieldLabel htmlFor="sessionNumber">
                Número da sessão
              </FieldLabel>
              <Input
                id="sessionNumber"
                inputMode="numeric"
                maxLength={40}
                placeholder="Ex.: 1"
                className="h-11"
                aria-invalid={Boolean(errors.sessionNumber)}
                {...register("sessionNumber")}
              />
              <FieldError errors={[errors.sessionNumber]} />
            </Field>

            <Field data-invalid={Boolean(errors.performedAt)}>
              <FieldLabel htmlFor="performedAt">Data e hora</FieldLabel>
              <Input
                id="performedAt"
                type="datetime-local"
                className="h-11"
                aria-invalid={Boolean(errors.performedAt)}
                {...register("performedAt")}
              />
              <FieldError errors={[errors.performedAt]} />
            </Field>

            <Field data-invalid={Boolean(errors.status)} className="sm:col-span-2">
              <FieldLabel htmlFor="status">Status da sessão</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="status" className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
              data-invalid={Boolean(errors.appointmentId)}
            >
              <FieldLabel htmlFor="appointmentId">
                Agendamento vinculado (opcional)
              </FieldLabel>
              <Controller
                control={control}
                name="appointmentId"
                render={({ field }) => (
                  <Select
                    value={field.value || NO_APPOINTMENT}
                    onValueChange={(value) =>
                      field.onChange(value === NO_APPOINTMENT ? "" : value)
                    }
                    disabled={!selectedPatientId || isLoadingAppointments}
                  >
                    <SelectTrigger
                      id="appointmentId"
                      className="h-11 w-full"
                      aria-invalid={Boolean(errors.appointmentId)}
                    >
                      <SelectValue placeholder="Sem vínculo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_APPOINTMENT}>
                        Sem vínculo
                      </SelectItem>
                      {patientAppointments.map((appointment) => (
                        <SelectItem
                          key={appointment.id}
                          value={appointment.id}
                        >
                          {formatDateTime(appointment.scheduledAt)} ·{" "}
                          {getAppointmentStatusLabel(appointment.status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.appointmentId ? (
                <FieldError errors={[errors.appointmentId]} />
              ) : (
                <FieldDescription>
                  {!selectedPatientId
                    ? "Selecione a paciente para listar os agendamentos."
                    : patientAppointments.length === 0
                      ? "Nenhum agendamento encontrado para esta paciente."
                      : "Vincule a sessão a um atendimento da paciente."}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.potency)}>
              <FieldLabel htmlFor="potency">Potência</FieldLabel>
              <Input
                id="potency"
                maxLength={80}
                placeholder="Ex.: 100"
                className="h-11"
                aria-invalid={Boolean(errors.potency)}
                {...register("potency")}
              />
              <FieldError errors={[errors.potency]} />
            </Field>

            <Field data-invalid={Boolean(errors.frequency)}>
              <FieldLabel htmlFor="frequency">Frequência</FieldLabel>
              <Input
                id="frequency"
                maxLength={80}
                placeholder="Ex.: 1"
                className="h-11"
                aria-invalid={Boolean(errors.frequency)}
                {...register("frequency")}
              />
              <FieldError errors={[errors.frequency]} />
            </Field>

            <Field data-invalid={Boolean(errors.technique)}>
              <FieldLabel htmlFor="technique">Técnica</FieldLabel>
              <Input
                id="technique"
                maxLength={120}
                placeholder="Ex.: Varredura"
                className="h-11"
                aria-invalid={Boolean(errors.technique)}
                {...register("technique")}
              />
              <FieldError errors={[errors.technique]} />
            </Field>

            <Field data-invalid={Boolean(errors.energyAccumulated)}>
              <FieldLabel htmlFor="energyAccumulated">
                Energia acumulada
              </FieldLabel>
              <Input
                id="energyAccumulated"
                maxLength={80}
                placeholder="Ex.: 1"
                className="h-11"
                aria-invalid={Boolean(errors.energyAccumulated)}
                {...register("energyAccumulated")}
              />
              <FieldError errors={[errors.energyAccumulated]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.applicatorId)}
            >
              <FieldLabel htmlFor="applicatorId">
                Aplicador (opcional)
              </FieldLabel>
              <Input
                id="applicatorId"
                placeholder="UUID do aplicador"
                autoComplete="off"
                className="h-11"
                aria-invalid={Boolean(errors.applicatorId)}
                {...register("applicatorId")}
              />
              {errors.applicatorId ? (
                <FieldError errors={[errors.applicatorId]} />
              ) : (
                <FieldDescription>
                  Informe o UUID de uma aplicadora cadastrada em Equipe ou deixe
                  em branco.
                </FieldDescription>
              )}
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.observations)}
            >
              <FieldLabel htmlFor="observations">Observações</FieldLabel>
              <Textarea
                id="observations"
                rows={4}
                maxLength={2000}
                placeholder="Evolução, intercorrências e orientações."
                aria-invalid={Boolean(errors.observations)}
                {...register("observations")}
              />
              <FieldError errors={[errors.observations]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.signature)}
            >
              <FieldLabel htmlFor="signature">Assinatura</FieldLabel>
              <Textarea
                id="signature"
                rows={3}
                placeholder="Assinatura digital ou texto de confirmação."
                aria-invalid={Boolean(errors.signature)}
                {...register("signature")}
              />
              <FieldError errors={[errors.signature]} />
              <FieldDescription>
                Conteúdo tratado como texto; o backend não define o formato.
              </FieldDescription>
            </Field>
          </FieldGroup>

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
              <Link href="/sessions">
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
              {isSubmitting ? "Registrando…" : "Registrar sessão"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
