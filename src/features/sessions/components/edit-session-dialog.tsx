"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
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
import { getAppointmentStatusLabel } from "@/features/appointments/utils";
import {
  editSessionFormSchema,
  type EditSessionFormValues,
} from "@/features/sessions/schemas";
import { SESSION_STATUS_OPTIONS } from "@/features/sessions/utils";
import { formatDateTime, toDateTimeInputValue } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { sessionsService } from "@/services";
import type { Appointment, SessionRecord, SessionStatus } from "@/types";

const NO_APPOINTMENT = "none";

interface EditSessionDialogProps {
  session: SessionRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: readonly Appointment[];
  isLoadingAppointments?: boolean;
  onSuccess: () => void;
}

export function EditSessionDialog({
  session,
  open,
  onOpenChange,
  appointments,
  isLoadingAppointments,
  onSuccess,
}: EditSessionDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditSessionFormValues>({
    resolver: zodResolver(editSessionFormSchema),
    defaultValues: {
      status: "completed",
      sessionNumber: "",
      performedAt: "",
      appointmentId: "",
      applicatorId: "",
      potency: "",
      frequency: "",
      technique: "",
      energyAccumulated: "",
      observations: "",
      signature: "",
    },
  });

  useEffect(() => {
    if (session) {
      const validStatus: SessionStatus =
        session.status === "in_progress" || session.status === "cancelled"
          ? session.status
          : "completed";

      reset({
        status: validStatus,
        sessionNumber: session.sessionNumber ?? "",
        performedAt: session.performedAt
          ? toDateTimeInputValue(session.performedAt)
          : "",
        appointmentId: session.appointmentId ?? "",
        applicatorId: session.applicatorId ?? "",
        potency: session.potency ?? "",
        frequency: session.frequency ?? "",
        technique: session.technique ?? "",
        energyAccumulated: session.energyAccumulated ?? "",
        observations: session.observations ?? "",
        signature: session.signature ?? "",
      });
    }
  }, [session, reset]);

  if (!session) return null;

  async function onSubmit(values: EditSessionFormValues) {
    if (!session) return;
    const toastId = toast.loading("Salvando alterações…");

    try {
      await sessionsService.update(session.id, {
        status: values.status,
        sessionNumber: values.sessionNumber,
        performedAt: new Date(values.performedAt).toISOString(),
        appointmentId: values.appointmentId.trim() || null,
        applicatorId: values.applicatorId.trim() || null,
        potency: values.potency || null,
        frequency: values.frequency || null,
        technique: values.technique || null,
        energyAccumulated: values.energyAccumulated || null,
        observations: values.observations || null,
        signature: values.signature || null,
      });

      toast.success("Sessão atualizada com sucesso.", { id: toastId });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      const message = getErrorMessage(error);
      setError("root", { message });
      toast.error(message, { id: toastId });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Sessão {session.sessionNumber}</DialogTitle>
          <DialogDescription>
            Atualize o status, data de realização, agendamento e parâmetros
            técnicos da sessão.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.status)}>
              <FieldLabel htmlFor="edit-session-status">Status da sessão</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="edit-session-status" className="h-10 w-full">
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

            <Field data-invalid={Boolean(errors.sessionNumber)}>
              <FieldLabel htmlFor="edit-sessionNumber">
                Número da sessão
              </FieldLabel>
              <Input
                id="edit-sessionNumber"
                inputMode="numeric"
                maxLength={40}
                className="h-10"
                aria-invalid={Boolean(errors.sessionNumber)}
                {...register("sessionNumber")}
              />
              <FieldError errors={[errors.sessionNumber]} />
            </Field>

            <Field data-invalid={Boolean(errors.performedAt)} className="sm:col-span-2">
              <FieldLabel htmlFor="edit-performedAt">Data e hora</FieldLabel>
              <Input
                id="edit-performedAt"
                type="datetime-local"
                className="h-10"
                aria-invalid={Boolean(errors.performedAt)}
                {...register("performedAt")}
              />
              <FieldError errors={[errors.performedAt]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.appointmentId)}
            >
              <FieldLabel htmlFor="edit-appointmentId">
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
                    disabled={isLoadingAppointments}
                  >
                    <SelectTrigger
                      id="edit-appointmentId"
                      className="h-10 w-full"
                      aria-invalid={Boolean(errors.appointmentId)}
                    >
                      <SelectValue placeholder="Sem vínculo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_APPOINTMENT}>
                        Sem vínculo
                      </SelectItem>
                      {appointments.map((appointment) => (
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
              <FieldError errors={[errors.appointmentId]} />
            </Field>

            <Field data-invalid={Boolean(errors.potency)}>
              <FieldLabel htmlFor="edit-potency">Potência</FieldLabel>
              <Input
                id="edit-potency"
                maxLength={80}
                className="h-10"
                aria-invalid={Boolean(errors.potency)}
                {...register("potency")}
              />
              <FieldError errors={[errors.potency]} />
            </Field>

            <Field data-invalid={Boolean(errors.frequency)}>
              <FieldLabel htmlFor="edit-frequency">Frequência</FieldLabel>
              <Input
                id="edit-frequency"
                maxLength={80}
                className="h-10"
                aria-invalid={Boolean(errors.frequency)}
                {...register("frequency")}
              />
              <FieldError errors={[errors.frequency]} />
            </Field>

            <Field data-invalid={Boolean(errors.technique)}>
              <FieldLabel htmlFor="edit-technique">Técnica</FieldLabel>
              <Input
                id="edit-technique"
                maxLength={120}
                className="h-10"
                aria-invalid={Boolean(errors.technique)}
                {...register("technique")}
              />
              <FieldError errors={[errors.technique]} />
            </Field>

            <Field data-invalid={Boolean(errors.energyAccumulated)}>
              <FieldLabel htmlFor="edit-energyAccumulated">
                Energia acumulada
              </FieldLabel>
              <Input
                id="edit-energyAccumulated"
                maxLength={80}
                className="h-10"
                aria-invalid={Boolean(errors.energyAccumulated)}
                {...register("energyAccumulated")}
              />
              <FieldError errors={[errors.energyAccumulated]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.applicatorId)}
            >
              <FieldLabel htmlFor="edit-applicatorId">
                Aplicador (UUID opcional)
              </FieldLabel>
              <Input
                id="edit-applicatorId"
                placeholder="UUID do aplicador"
                autoComplete="off"
                className="h-10"
                aria-invalid={Boolean(errors.applicatorId)}
                {...register("applicatorId")}
              />
              <FieldError errors={[errors.applicatorId]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.observations)}
            >
              <FieldLabel htmlFor="edit-observations">Observações</FieldLabel>
              <Textarea
                id="edit-observations"
                rows={3}
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
              <FieldLabel htmlFor="edit-signature">Assinatura</FieldLabel>
              <Textarea
                id="edit-signature"
                rows={2}
                placeholder="Assinatura digital ou texto de confirmação."
                aria-invalid={Boolean(errors.signature)}
                {...register("signature")}
              />
              <FieldError errors={[errors.signature]} />
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

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSubmitting ? "Salvando…" : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
