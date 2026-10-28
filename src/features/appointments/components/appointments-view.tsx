"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
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
  getAppointmentProximity,
  getAppointmentStatusLabel,
  isAppointmentConfirmable,
  type AppointmentProximity,
} from "@/features/appointments/utils";
import {
  canUseAppointmentWhatsApp,
  getAppointmentWhatsAppConfirmationHref,
  shouldShowAppointmentWhatsApp,
  type AppointmentWhatsAppPatient,
} from "@/features/appointments/whatsapp";
import { useApiQuery, usePagination } from "@/hooks";
import {
  AppointmentProximityFilter,
  AppointmentProximityFlag,
} from "@/features/appointments/components/appointment-proximity-flag";
import {
  formatDateTime,
  toEndOfDayIso,
  toStartOfDayIso,
} from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { cn } from "@/lib/utils";
import { isValidWhatsAppNumber } from "@/lib/whatsapp";
import {
  appointmentsService,
  citiesService,
  patientsService,
  usersService,
} from "@/services";
import type {
  Appointment,
  AppointmentStatus,
  AuthUser,
  Patient,
} from "@/types";

async function listAllPatients(signal: AbortSignal): Promise<Patient[]> {
  const patients: Patient[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await patientsService.list(
      { page, limit: 100 },
      { signal },
    );
    patients.push(...response.data);
    totalPages = response.meta.totalPages;
    page += 1;
  } while (page <= totalPages && page <= 100);

  return patients;
}

interface AppointmentWhatsAppLookup {
  contact: AppointmentWhatsAppPatient | null;
  failed: boolean;
}

function getAppointmentProfessionalName(
  appointment: Appointment,
  professionalNames: Map<string, string>,
): string {
  return (
    appointment.professionalName ??
    (appointment.professionalId
      ? professionalNames.get(appointment.professionalId) ?? "—"
      : "—")
  );
}

async function loadAppointmentWhatsAppContacts(
  patientIds: string[],
  signal: AbortSignal,
): Promise<Map<string, AppointmentWhatsAppLookup>> {
  const results = await Promise.allSettled(
    patientIds.map(async (patientId) => {
      const patient = await patientsService.getById(patientId, { signal });

      return {
        fullName: patient.fullName,
        whatsapp: patient.whatsapp,
      };
    }),
  );

  return new Map(
    results.map((result, index) => [
      patientIds[index],
      result.status === "fulfilled"
        ? { contact: result.value, failed: false }
        : { contact: null, failed: true },
    ]),
  );
}

type SortKey =
  | "scheduledAt"
  | "createdAt"
  | "patient"
  | "city"
  | "professional"
  | "status";
type SortDirection = "asc" | "desc";
type AppointmentSort = { key: SortKey; direction: SortDirection };

const COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base" });

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: AppointmentSort | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const direction = sort?.key === sortKey ? sort.direction : null;
  const isActive = direction !== null;
  const Icon = !direction
    ? ArrowUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead
      className={className}
      aria-sort={
        !direction
          ? "none"
          : direction === "asc"
            ? "ascending"
            : "descending"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-1 transition-colors hover:text-foreground",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </TableHead>
  );
}

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

export function AppointmentsView({
  canCreate,
  canWrite,
  currentUser,
}: {
  canCreate: boolean;
  canWrite: boolean;
  currentUser: AuthUser;
}) {
  const isManager = currentUser.role === "gestora";
  const canContactViaWhatsApp = canUseAppointmentWhatsApp(currentUser.role);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<AppointmentStatus | "all">("all");
  const [cityId, setCityId] = useState("");
  const [professionalIdFilter, setProfessionalIdFilter] = useState("");
  const [proximityFilter, setProximityFilter] =
    useState<AppointmentProximity | null>(null);
  const [sort, setSort] = useState<AppointmentSort | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] =
    useState<Appointment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const professionalId = professionalIdFilter || undefined;

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

  const { data: patients, isLoading: isLoadingPatients } = useApiQuery(
    (signal) => listAllPatients(signal),
    "appointments-patients",
  );

  const { data: users } = useApiQuery(
    (signal) => usersService.list({ signal }),
    "appointments-users",
    { enabled: isManager },
  );

  const cityNames = useMemo(
    () => new Map((cities ?? []).map((city) => [city.id, city.name])),
    [cities],
  );

  const professionals = useMemo(
    () =>
      [...(users ?? [])]
        .map((user) => ({ id: user.id, name: user.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [users],
  );

  const professionalNames = useMemo(() => {
    const names = new Map(
      professionals.map((professional) => [
        professional.id,
        professional.name,
      ]),
    );

    names.set(currentUser.id, currentUser.name);

    return names;
  }, [professionals, currentUser.id, currentUser.name]);

  const patientsById = useMemo(
    () => new Map((patients ?? []).map((patient) => [patient.id, patient])),
    [patients],
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

  const filteredAppointments = useMemo(() => {
    const filtered = appointments.filter((appointment) => {
      if (status !== "all" && appointment.status !== status) {
        return false;
      }

      if (
        proximityFilter &&
        getAppointmentProximity(
          appointment.scheduledAt,
          appointment.status,
        ) !== proximityFilter
      ) {
        return false;
      }

      return true;
    });

    if (!sort) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sort.key) {
        case "scheduledAt":
          comparison =
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime();
          break;
        case "createdAt":
          comparison =
            new Date(a.createdAt).getTime() -
            new Date(b.createdAt).getTime();
          break;
        case "patient":
          comparison = COLLATOR.compare(
            patientsById.get(a.patientId)?.fullName ?? "",
            patientsById.get(b.patientId)?.fullName ?? "",
          );
          break;
        case "city":
          comparison = COLLATOR.compare(
            cityNames.get(a.cityId) ?? "",
            cityNames.get(b.cityId) ?? "",
          );
          break;
        case "professional":
          comparison = COLLATOR.compare(
            getAppointmentProfessionalName(a, professionalNames),
            getAppointmentProfessionalName(b, professionalNames),
          );
          break;
        case "status":
          comparison = COLLATOR.compare(
            getAppointmentStatusLabel(a.status),
            getAppointmentStatusLabel(b.status),
          );
          break;
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [
    appointments,
    status,
    proximityFilter,
    sort,
    patientsById,
    cityNames,
    professionalNames,
  ]);

  const { pageItems, page, totalItems, setPage } = usePagination(
    filteredAppointments,
    {
      resetKey: `${fromDate}:${toDate}:${cityId}:${professionalId ?? ""}:${status}:${proximityFilter ?? "all"}:${sort?.key ?? "none"}:${sort?.direction ?? ""}`,
    },
  );

  const whatsappLookupPatientIds = useMemo(() => {
    if (!canContactViaWhatsApp || isLoadingPatients) {
      return [];
    }

    return [
      ...new Set(
        pageItems
          .filter((appointment) =>
            isAppointmentConfirmable(appointment.status),
          )
          .map((appointment) => appointment.patientId),
      ),
    ]
      .filter(
        (patientId) =>
          !isValidWhatsAppNumber(patientsById.get(patientId)?.whatsapp),
      )
      .sort();
  }, [canContactViaWhatsApp, isLoadingPatients, pageItems, patientsById]);

  const {
    data: whatsappLookups,
    isLoading: isLoadingWhatsAppLookups,
  } = useApiQuery(
    (signal) => loadAppointmentWhatsAppContacts(whatsappLookupPatientIds, signal),
    `appointments-whatsapp:${whatsappLookupPatientIds.join(",")}`,
    {
      enabled:
        canContactViaWhatsApp && whatsappLookupPatientIds.length > 0,
    },
  );

  const whatsappLookupPatientIdSet = useMemo(
    () => new Set(whatsappLookupPatientIds),
    [whatsappLookupPatientIds],
  );

  const hasFilters = Boolean(
    fromDate ||
      toDate ||
      status !== "all" ||
      cityId ||
      professionalIdFilter ||
      proximityFilter,
  );

  async function handleDelete() {
    if (!appointmentToDelete) return;

    setIsDeleting(true);
    try {
      await appointmentsService.remove(appointmentToDelete.id);
      toast.success("Agendamento excluído.");
      setAppointmentToDelete(null);
      refetch();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setStatus("all");
    setCityId("");
    setProfessionalIdFilter("");
    setProximityFilter(null);
  }

  function handleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction:
          key === "scheduledAt" || key === "createdAt" ? "desc" : "asc",
      };
    });
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

  const createAction = canCreate ? (
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

          {isManager && (
            <Field>
              <FieldLabel htmlFor="filter-professional">Profissional</FieldLabel>
              <Select
                value={professionalIdFilter || "all"}
                onValueChange={(value) =>
                  setProfessionalIdFilter(value === "all" ? "" : value)
                }
              >
                <SelectTrigger id="filter-professional" className="h-10 w-full">
                  <SelectValue placeholder="Todos os profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {professionals.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
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
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span>Sinalização:</span>
              {(["normal", "tomorrow", "today"] as const).map((proximity) => (
                <AppointmentProximityFilter
                  key={proximity}
                  proximity={proximity}
                  active={proximityFilter === proximity}
                  onClick={() =>
                    setProximityFilter((current) =>
                      current === proximity ? null : proximity,
                    )
                  }
                />
              ))}
              <span className="text-muted-foreground/80">
                Clique para filtrar
              </span>
            </div>
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
                    : canCreate
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
              ) : canCreate ? (
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
                      <SortableHead
                        label="Criado em"
                        sortKey="createdAt"
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHead
                        label="Data do Agendamento"
                        sortKey="scheduledAt"
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHead
                        label="Paciente"
                        sortKey="patient"
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHead
                        label="Cidade"
                        sortKey="city"
                        sort={sort}
                        onSort={handleSort}
                      />
                      <SortableHead
                        label="Profissional"
                        sortKey="professional"
                        sort={sort}
                        onSort={handleSort}
                        className="hidden xl:table-cell"
                      />
                      <SortableHead
                        label="Status"
                        sortKey="status"
                        sort={sort}
                        onSort={handleSort}
                        className="w-[1%]"
                      />
                      <TableHead className="w-[1%] text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((appointment) => {
                      const patient = patientsById.get(
                        appointment.patientId,
                      );
                      const whatsappLookup = whatsappLookups?.get(
                        appointment.patientId,
                      );
                      const whatsappPatient =
                        whatsappLookup?.contact ?? patient;
                      const cityName =
                        cityNames.get(appointment.cityId) ?? "—";
                      const whatsappHref =
                        getAppointmentWhatsAppConfirmationHref(
                          currentUser.role,
                          whatsappPatient,
                          formatDateTime(appointment.scheduledAt),
                          cityName,
                        );
                      const isConfirmable = isAppointmentConfirmable(
                        appointment.status,
                      );
                      const showWhatsApp = shouldShowAppointmentWhatsApp(
                        currentUser.role,
                        isConfirmable,
                      );
                      const isLookingUpWhatsApp =
                        !isValidWhatsAppNumber(patient?.whatsapp) &&
                        (isLoadingPatients ||
                          (isLoadingWhatsAppLookups &&
                            whatsappLookupPatientIdSet.has(
                              appointment.patientId,
                            )));
                      const whatsappUnavailableLabel = isLookingUpWhatsApp
                        ? "Carregando WhatsApp"
                        : whatsappLookup?.failed
                          ? "Falha ao carregar WhatsApp"
                          : "WhatsApp indisponível";

                      return (
                        <TableRow key={appointment.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(appointment.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatDateTime(appointment.scheduledAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <span>
                                {patient?.fullName ?? "Paciente não listado"}
                              </span>
                              <AppointmentProximityFlag
                                scheduledAt={appointment.scheduledAt}
                                status={appointment.status}
                              />
                            </div>
                          </TableCell>
                          <TableCell>{cityName}</TableCell>
                          <TableCell className="hidden text-muted-foreground xl:table-cell">
                            {appointment.professionalId
                            ? getAppointmentProfessionalName(
                                appointment,
                                professionalNames,
                              )
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
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {showWhatsApp &&
                                (whatsappHref ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    asChild
                                    title="Confirmar agendamento via WhatsApp"
                                  >
                                    <a
                                      href={whatsappHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label={`Confirmar agendamento de ${patient?.fullName ?? "paciente"} via WhatsApp`}
                                    >
                                      <MessageCircle className="size-4 text-emerald-600" />
                                    </a>
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    disabled
                                    title={whatsappUnavailableLabel}
                                    aria-label={whatsappUnavailableLabel}
                                  >
                                    <MessageCircle className="size-4" />
                                  </Button>
                                ))}
                              {showWhatsApp &&
                                !whatsappHref && (
                                  <span className="text-xs text-muted-foreground">
                                    {whatsappUnavailableLabel}
                                  </span>
                                )}
                              {canWrite && (
                                <>
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
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Excluir agendamento de ${formatDateTime(appointment.scheduledAt)}`}
                                    onClick={() =>
                                      setAppointmentToDelete(appointment)
                                    }
                                  >
                                    <Trash2 className="size-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 lg:hidden">
                {pageItems.map((appointment) => {
                  const patient = patientsById.get(appointment.patientId);
                  const whatsappLookup = whatsappLookups?.get(
                    appointment.patientId,
                  );
                  const whatsappPatient =
                    whatsappLookup?.contact ?? patient;
                  const cityName = cityNames.get(appointment.cityId) ?? "—";
                  const whatsappHref =
                    getAppointmentWhatsAppConfirmationHref(
                      currentUser.role,
                      whatsappPatient,
                      formatDateTime(appointment.scheduledAt),
                      cityName,
                    );
                  const isConfirmable = isAppointmentConfirmable(
                    appointment.status,
                  );
                  const showWhatsApp = shouldShowAppointmentWhatsApp(
                    currentUser.role,
                    isConfirmable,
                  );
                  const isLookingUpWhatsApp =
                    !isValidWhatsAppNumber(patient?.whatsapp) &&
                    (isLoadingPatients ||
                      (isLoadingWhatsAppLookups &&
                        whatsappLookupPatientIdSet.has(appointment.patientId)));
                  const whatsappUnavailableLabel = isLookingUpWhatsApp
                    ? "Carregando WhatsApp"
                    : whatsappLookup?.failed
                      ? "Falha ao carregar WhatsApp"
                      : "WhatsApp indisponível";

                  return (
                    <Card key={appointment.id} size="sm">
                      <CardContent className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Criado em:{" "}
                              {formatDateTime(appointment.createdAt)}
                            </p>
                            <p className="font-medium">
                              Data do Agendamento:{" "}
                              {formatDateTime(appointment.scheduledAt)}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm">
                                {patient?.fullName ??
                                  "Paciente não listado"}
                              </p>
                              <AppointmentProximityFlag
                                scheduledAt={appointment.scheduledAt}
                                status={appointment.status}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cityName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Profissional:{" "}
                              {getAppointmentProfessionalName(
                                appointment,
                                professionalNames,
                              )}
                            </p>
                          </div>
                          {canWrite && (
                            <div className="flex items-center gap-1">
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
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Excluir agendamento"
                                onClick={() =>
                                  setAppointmentToDelete(appointment)
                                }
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="min-w-36 flex-1">
                            <StatusControl
                              appointment={appointment}
                              canWrite={canWrite}
                              isUpdating={updatingId === appointment.id}
                              onChange={(status) =>
                                void handleStatusChange(appointment, status)
                              }
                            />
                          </div>
                          {showWhatsApp &&
                            (whatsappHref ? (
                              <Button
                                type="button"
                                size="sm"
                                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                                asChild
                              >
                                <a
                                  href={whatsappHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Confirmar agendamento de ${patient?.fullName ?? "paciente"} via WhatsApp`}
                                >
                                  <MessageCircle className="size-4" />
                                  Confirmar no WhatsApp
                                </a>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled
                                title={whatsappUnavailableLabel}
                                aria-label={whatsappUnavailableLabel}
                              >
                                <MessageCircle className="size-4" />
                                {whatsappUnavailableLabel}
                              </Button>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {!isLoading && !error && (
            <Pagination
              page={page}
              totalItems={totalItems}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
      <ConfirmDeleteDialog
        open={Boolean(appointmentToDelete)}
        onOpenChange={(open) => {
          if (!open) setAppointmentToDelete(null);
        }}
        title="Excluir agendamento?"
        description={
          <>
            O agendamento de{" "}
            <strong className="font-medium text-foreground">
              {appointmentToDelete
                ? formatDateTime(appointmentToDelete.scheduledAt)
                : ""}
            </strong>{" "}
            será removido permanentemente. Agendamentos com sessão vinculada
            não podem ser excluídos; nesse caso, altere o status para
            cancelado.
          </>
        }
        isDeleting={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
