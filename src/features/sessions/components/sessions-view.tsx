"use client";

import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
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
  APPOINTMENT_STATUS_OPTIONS,
  APPOINTMENT_STATUS_BADGE_VARIANTS,
  getAppointmentStatusLabel,
} from "@/features/appointments/utils";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import { shortId, sortSessionsByPerformedAt } from "@/features/sessions/utils";
import { useApiQuery } from "@/hooks";
import { formatDateTime, toDateInputValue } from "@/lib/format/date";
import { appointmentsService, sessionsService } from "@/services";
import type { AppointmentStatus, SessionRecord } from "@/types";

interface TechItemProps {
  label: string;
  value: string | null;
}

function TechItem({ label, value }: TechItemProps) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value?.trim() || "—"}</dd>
    </div>
  );
}

function SessionCard({
  session,
  appointmentStatus,
}: {
  session: SessionRecord;
  appointmentStatus: AppointmentStatus | null;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-md bg-secondary text-secondary-foreground">
              <ClipboardList className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-base">
                Sessão {session.sessionNumber}
              </CardTitle>
              <CardDescription>
                {formatDateTime(session.performedAt)}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={
              appointmentStatus
                ? APPOINTMENT_STATUS_BADGE_VARIANTS[appointmentStatus]
                : "outline"
            }
          >
            {appointmentStatus
              ? getAppointmentStatusLabel(appointmentStatus)
              : "Sem status"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TechItem label="Potência" value={session.potency} />
          <TechItem label="Frequência" value={session.frequency} />
          <TechItem label="Técnica" value={session.technique} />
          <TechItem
            label="Energia acumulada"
            value={session.energyAccumulated}
          />
        </dl>

        {session.observations && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Observações
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {session.observations}
            </p>
          </div>
        )}

        {session.signature && (
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Assinatura
            </p>
            <p className="line-clamp-3 break-all whitespace-pre-wrap rounded-lg border bg-muted/40 px-3 py-2 text-xs">
              {session.signature}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            Agendamento:{" "}
            <span className="font-mono">{shortId(session.appointmentId)}</span>
          </span>
          <span>
            Aplicador:{" "}
            <span className="font-mono">{shortId(session.applicatorId)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-48 w-full" />
      ))}
    </div>
  );
}

export function SessionsView({
  initialPatientId,
  canWrite,
}: {
  initialPatientId: string;
  canWrite: boolean;
}) {
  const [patientId, setPatientId] = useState(initialPatientId);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => sessionsService.listByPatient(patientId, { signal }),
    `sessions:${patientId}`,
    { enabled: Boolean(patientId) },
  );
  const {
    data: appointments,
    error: appointmentsError,
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useApiQuery(
    (signal) => appointmentsService.list({}, { signal }),
    "sessions-appointments",
    { enabled: Boolean(patientId) },
  );

  const sessions = sortSessionsByPerformedAt(data ?? []);
  const appointmentsById = useMemo(
    () => new Map((appointments ?? []).map((appointment) => [appointment.id, appointment])),
    [appointments],
  );
  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const sessionDate = toDateInputValue(session.performedAt);
        const appointment = session.appointmentId
          ? appointmentsById.get(session.appointmentId)
          : undefined;

        if (
          (fromDate && sessionDate < fromDate) ||
          (toDate && sessionDate > toDate)
        ) {
          return false;
        }

        return status === "all" || appointment?.status === status;
      }),
    [appointmentsById, fromDate, sessions, status, toDate],
  );
  const loadError = error ?? appointmentsError;
  const isLoadingHistory = isLoading || appointmentsLoading;

  function retryHistory() {
    refetch();
    refetchAppointments();
  }

  const createAction = canWrite ? (
    <Button asChild>
      <Link
        href={
          patientId
            ? `/sessions/new?patientId=${encodeURIComponent(patientId)}`
            : "/sessions/new"
        }
      >
        <Plus className="size-4" />
        Nova sessão
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessões"
        description="Consulte o histórico de sessões e os parâmetros técnicos registrados por paciente."
        actions={createAction}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paciente</CardTitle>
          <CardDescription>
            Selecione a paciente para visualizar o histórico de sessões.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl">
          <Field>
            <FieldLabel htmlFor="session-patient">Paciente</FieldLabel>
            <PatientCombobox
              id="session-patient"
              value={patientId}
              onChange={setPatientId}
            />
          </Field>
        </CardContent>
      </Card>

      {patientId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros do histórico</CardTitle>
            <CardDescription>
              O período considera a data de realização; o status vem do agendamento relacionado.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="session-from">De</FieldLabel>
              <Input
                id="session-from"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="session-to">Até</FieldLabel>
              <Input
                id="session-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="session-status">Status do agendamento</FieldLabel>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as AppointmentStatus | "all")
                }
              >
                <SelectTrigger id="session-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {APPOINTMENT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>
      )}

      {!patientId ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Selecione uma paciente</p>
            <p className="text-sm text-muted-foreground">
              O histórico de sessões é exibido por paciente.
            </p>
          </div>
        </div>
      ) : isLoadingHistory ? (
        <LoadingState />
      ) : loadError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar as sessões</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{loadError}</p>
            <Button type="button" size="sm" onClick={retryHistory}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <CalendarClock className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">
              {sessions.length === 0
                ? "Nenhuma sessão registrada"
                : "Nenhuma sessão corresponde aos filtros"}
            </p>
            <p className="text-sm text-muted-foreground">
              {sessions.length > 0
                ? "Ajuste o período ou o status do agendamento."
                : canWrite
                ? "Registre a primeira sessão desta paciente."
                : "Ainda não há sessões registradas para esta paciente."}
            </p>
          </div>
          {canWrite && sessions.length === 0 && (
            <Button asChild size="sm">
              <Link
                href={`/sessions/new?patientId=${encodeURIComponent(patientId)}`}
              >
                <Plus className="size-4" />
                Nova sessão
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              appointmentStatus={
                session.appointmentId
                  ? appointmentsById.get(session.appointmentId)?.status ?? null
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
