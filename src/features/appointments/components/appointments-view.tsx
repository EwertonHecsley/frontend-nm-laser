"use client";

import {
  AlertTriangle,
  CalendarDays,
  Pencil,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  APPOINTMENT_STATUS_BADGE_VARIANTS,
  APPOINTMENT_STATUS_OPTIONS,
  getAppointmentStatusLabel,
  isUuid,
} from "@/features/appointments/utils";
import { useApiQuery, useDebouncedValue } from "@/hooks";
import {
  formatDateTime,
  toEndOfDayIso,
  toStartOfDayIso,
} from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { appointmentsService, citiesService, patientsService } from "@/services";
import type { Appointment, AppointmentStatus } from "@/types";

function LoadingState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

function StatusControl({
  appointment,
  canWrite,
  isUpdating,
  onChange,
}: {
  appointment: Appointment;
  canWrite: boolean;
  isUpdating: boolean;
  onChange: (status: AppointmentStatus) => void;
}) {
  if (!canWrite) {
    return (
      <Badge variant={APPOINTMENT_STATUS_BADGE_VARIANTS[appointment.status]}>
        {getAppointmentStatusLabel(appointment.status)}
      </Badge>
    );
  }

  return (
    <Select
      value={appointment.status}
      onValueChange={(value) => onChange(value as AppointmentStatus)}
      disabled={isUpdating}
    >
      <SelectTrigger
        size="sm"
        className="w-full min-w-36"
        aria-label={`Alterar status de ${appointment.patientId}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPOINTMENT_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppointmentsView({ canWrite }: { canWrite: boolean }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [cityId, setCityId] = useState("");
  const [professionalInput, setProfessionalInput] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const debouncedProfessional = useDebouncedValue(
    professionalInput,
    400,
  ).trim();
  const hasInvalidProfessional =
    debouncedProfessional !== "" && !isUuid(debouncedProfessional);
  const professionalId =
    debouncedProfessional && !hasInvalidProfessional
      ? debouncedProfessional
      : undefined;

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) =>
      appointmentsService.list(
        {
          from: fromDate ? toStartOfDayIso(fromDate) : undefined,
          to: toDate ? toEndOfDayIso(toDate) : undefined,
          cityId: cityId || undefined,
          professionalId,
        },
        { signal },
      ),
    `appointments:${fromDate}:${toDate}:${cityId}:${professionalId ?? ""}`,
  );

  const { data: cities } = useApiQuery(
    (signal) => citiesService.list({ signal }),
    "cities",
  );

  const { data: patientsPage } = useApiQuery(
    (signal) => patientsService.list({ page: 1, limit: 100 }, { signal }),
    "appointments-patients",
  );

  const cityNames = useMemo(
    () => new Map((cities ?? []).map((city) => [city.id, city.name])),
    [cities],
  );

  const patientNames = useMemo(
    () =>
      new Map(
        (patientsPage?.data ?? []).map((patient) => [
          patient.id,
          patient.fullName,
        ]),
      ),
    [patientsPage],
  );

  const appointments = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime(),
      ),
    [data],
  );

  const filteredAppointments = useMemo(
    () =>
      status === "all"
        ? appointments
        : appointments.filter((appointment) => appointment.status === status),
    [appointments, status],
  );

  const hasFilters = Boolean(
    fromDate || toDate || status !== "all" || cityId || professionalInput,
  );

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setStatus("all");
    setCityId("");
    setProfessionalInput("");
  }

  async function handleStatusChange(
    appointment: Appointment,
    status: AppointmentStatus,
  ) {
    if (status === appointment.status) {
      return;
    }

    setUpdatingId(appointment.id);

    try {
      await appointmentsService.update(appointment.id, { status });
      toast.success("Status atualizado.");
      refetch();
    } catch (updateError) {
      toast.error(getErrorMessage(updateError));
    } finally {
      setUpdatingId(null);
    }
  }

  const createAction = canWrite ? (
    <Button asChild>
      <Link href="/appointments/new">
        <Plus className="size-4" />
        Novo agendamento
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        description="Acompanhe a agenda por período, cidade e profissional. O status pode ser atualizado diretamente na lista."
        actions={createAction}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            Refine a agenda por período, cidade ou profissional.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field>
            <FieldLabel htmlFor="filter-from">De</FieldLabel>
            <Input
              id="filter-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="filter-to">Até</FieldLabel>
            <Input
              id="filter-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="filter-status">Status</FieldLabel>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as AppointmentStatus | "all")
              }
            >
              <SelectTrigger id="filter-status" className="h-10 w-full">
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

          <Field>
            <FieldLabel htmlFor="filter-city">Cidade</FieldLabel>
            <Select
              value={cityId || undefined}
              onValueChange={(value) => setCityId(value)}
            >
              <SelectTrigger id="filter-city" className="h-10 w-full">
                <SelectValue placeholder="Todas as cidades" />
              </SelectTrigger>
              <SelectContent>
                {(cities ?? []).map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field data-invalid={hasInvalidProfessional}>
            <FieldLabel htmlFor="filter-professional">
              Profissional (UUID)
            </FieldLabel>
            <Input
              id="filter-professional"
              value={professionalInput}
              onChange={(event) => setProfessionalInput(event.target.value)}
              placeholder="UUID do profissional"
              autoComplete="off"
              className="h-10"
              aria-invalid={hasInvalidProfessional}
            />
            {hasInvalidProfessional && (
              <FieldError>Informe um UUID válido ou deixe em branco.</FieldError>
            )}
          </Field>
        </CardContent>
        {hasFilters && (
          <CardFooter className="justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
            >
              <X className="size-4" />
              Limpar filtros
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Agenda</CardTitle>
              {!isLoading && !error && (
                <Badge variant="secondary">{filteredAppointments.length}</Badge>
              )}
            </div>
            <CardDescription>
              {hasFilters
                ? "Resultados conforme os filtros aplicados."
                : "Todos os agendamentos cadastrados."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Não foi possível carregar os agendamentos</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{error}</p>
                <Button type="button" size="sm" onClick={refetch}>
                  <RefreshCw className="size-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          ) : filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <CalendarDays className="size-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {hasFilters
                    ? "Nenhum agendamento encontrado"
                    : "Nenhum agendamento cadastrado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasFilters
                    ? "Ajuste o período ou os filtros para ver outros resultados."
                    : canWrite
                      ? "Agende o primeiro horário para começar."
                      : "Ainda não há agendamentos cadastrados."}
                </p>
              </div>
              {hasFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Limpar filtros
                </Button>
              ) : canWrite ? (
                <Button asChild size="sm">
                  <Link href="/appointments/new">
                    <Plus className="size-4" />
                    Novo agendamento
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data e hora</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead className="hidden xl:table-cell">
                        Profissional
                      </TableHead>
                      <TableHead className="w-[1%]">Status</TableHead>
                      {canWrite && (
                        <TableHead className="w-[1%] text-right">
                          Ações
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">
                          {formatDateTime(appointment.scheduledAt)}
                        </TableCell>
                        <TableCell>
                          {patientNames.get(appointment.patientId) ??
                            "Paciente não listado"}
                        </TableCell>
                        <TableCell>
                          {cityNames.get(appointment.cityId) ?? "—"}
                        </TableCell>
                        <TableCell className="hidden font-mono text-xs text-muted-foreground xl:table-cell">
                          {appointment.professionalId
                            ? `${appointment.professionalId.slice(0, 8)}…`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusControl
                            appointment={appointment}
                            canWrite={canWrite}
                            isUpdating={updatingId === appointment.id}
                            onChange={(status) =>
                              void handleStatusChange(appointment, status)
                            }
                          />
                        </TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              asChild
                              aria-label={`Editar agendamento de ${formatDateTime(appointment.scheduledAt)}`}
                            >
                              <Link
                                href={`/appointments/${appointment.id}/edit`}
                              >
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 lg:hidden">
                {filteredAppointments.map((appointment) => (
                  <Card key={appointment.id} size="sm">
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">
                            {formatDateTime(appointment.scheduledAt)}
                          </p>
                          <p className="truncate text-sm">
                            {patientNames.get(appointment.patientId) ??
                              "Paciente não listado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {cityNames.get(appointment.cityId) ?? "—"}
                          </p>
                        </div>
                        {canWrite && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            asChild
                            aria-label="Editar agendamento"
                          >
                            <Link
                              href={`/appointments/${appointment.id}/edit`}
                            >
                              <Pencil className="size-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                      <StatusControl
                        appointment={appointment}
                        canWrite={canWrite}
                        isUpdating={updatingId === appointment.id}
                        onChange={(status) =>
                          void handleStatusChange(appointment, status)
                        }
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
