"use client";

import {
  AlertTriangle,
  CalendarClock,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "cn";

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
import { getAppointmentStatusLabel } from "@/features/appointments/utils";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import { EditSessionDialog } from "@/features/sessions/components/edit-session-dialog";
import { SessionOpportunities } from "@/features/sessions/components/session-opportunities";
import {
  SESSION_STATUS_OPTIONS,
  SESSION_STATUS_BADGE_VARIANTS,
  getSessionStatusLabel,
  shortId,
} from "@/features/sessions/utils";
import { useApiQuery } from "@/hooks";
import {
  formatDateTime,
  toEndOfDayIso,
  toStartOfDayIso,
} from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { appointmentsService, salesService, sessionsService } from "@/services";
import type {
  Appointment,
  SessionOverviewItem,
  SessionOverviewStats,
  SessionStatus,
} from "@/types";

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
  appointment,
  canWrite,
  isUpdating,
  onEdit,
  onStatusChange,
}: {
  session: SessionOverviewItem;
  appointment?: Appointment;
  canWrite: boolean;
  isUpdating: boolean;
  onEdit: (session: SessionOverviewItem) => void;
  onStatusChange: (status: SessionStatus) => void;
}) {
  const sessionStatus = session.status ?? "completed";
  const normalizedStatus: SessionStatus =
    sessionStatus === "in_progress" || sessionStatus === "cancelled"
      ? sessionStatus
      : "completed";
  const badgeVariant =
    SESSION_STATUS_BADGE_VARIANTS[normalizedStatus] ?? "default";
  const statusLabel = getSessionStatusLabel(normalizedStatus);

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
                {session.patient.fullName}
              </CardTitle>
              <CardDescription>
                Sessão {session.sessionNumber} ·{" "}
                {formatDateTime(session.performedAt)}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canWrite ? (
              <Select
                value={normalizedStatus}
                onValueChange={(value) =>
                  onStatusChange(value as SessionStatus)
                }
                disabled={isUpdating}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full min-w-36"
                  aria-label={`Alterar status da sessão ${session.sessionNumber}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={badgeVariant}>{statusLabel}</Badge>
            )}
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(session)}
                className="h-8 gap-1.5"
              >
                <Pencil className="size-3.5" />
                <span>Editar</span>
              </Button>
            )}
          </div>
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

        {(session.packageName || session.areas.length > 0) && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Pacote contratado
            </p>
            <p className="text-sm">
              {session.packageName ?? "Pacote não identificado"}
            </p>
            {session.areas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {session.areas.map((area) => (
                  <Badge key={area.id} variant="secondary">
                    {area.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

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
            {appointment ? (
              <span className="font-mono">
                {shortId(appointment.id)} (
                {getAppointmentStatusLabel(appointment.status)})
              </span>
            ) : (
              <span className="font-mono">{shortId(session.appointmentId)}</span>
            )}
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

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  detail?: string;
  icon: LucideIcon;
  tone?: "default" | "completed" | "progress" | "cancelled" | "patients";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones: Record<typeof tone, string> = {
    default: "bg-secondary text-secondary-foreground",
    completed: "bg-emerald-600/10 text-emerald-700",
    progress: "bg-amber-500/10 text-amber-700",
    cancelled: "bg-rose-600/10 text-rose-700",
    patients: "bg-sky-600/10 text-sky-700",
  };

  return (
    <Card
      className={cn(
        "relative transition",
        onClick &&
          "cursor-pointer hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "ring-2 ring-primary",
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? active : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        </div>
        <span
          className={cn(
            "grid size-10 place-items-center rounded-lg",
            tones[tone],
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardHeader>
      {detail && (
        <CardContent className="text-xs text-muted-foreground">
          {detail}
        </CardContent>
      )}
    </Card>
  );
}

function SessionsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}

function StatusDistribution({ stats }: { stats: SessionOverviewStats }) {
  const items = [
    {
      key: "completed",
      label: "Concluídas",
      color: "bg-emerald-600",
      count: stats.completed,
    },
    {
      key: "in_progress",
      label: "Em andamento",
      color: "bg-amber-500",
      count: stats.inProgress,
    },
    {
      key: "cancelled",
      label: "Canceladas",
      color: "bg-rose-600",
      count: stats.cancelled,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribuição por status</CardTitle>
        <CardDescription>
          {stats.total} {stats.total === 1 ? "sessão" : "sessões"} no recorte
          filtrado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex h-3 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label="Distribuição proporcional das sessões por status"
        >
          {items.map(({ key, color, count }) => (
            <span
              key={key}
              className={color}
              style={{
                width: `${stats.total ? (count / stats.total) * 100 : 0}%`,
              }}
            />
          ))}
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {items.map(({ key, label, color, count }) => (
            <li
              key={key}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={cn("size-2.5 rounded-full", color)} />
                {label}
              </span>
              <span className="text-sm font-medium tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function SessionsView({
  initialPatientId,
  canWrite,
  canCreateSale = false,
  canSchedule = false,
}: {
  initialPatientId: string;
  canWrite: boolean;
  canCreateSale?: boolean;
  canSchedule?: boolean;
}) {
  const [patientId, setPatientId] = useState(initialPatientId);
  const [opportunitiesRefreshKey, setOpportunitiesRefreshKey] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState<SessionStatus | "all">("all");
  const [editingSession, setEditingSession] =
    useState<SessionOverviewItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const from = toStartOfDayIso(fromDate);
  const to = toEndOfDayIso(toDate);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) =>
      sessionsService.overview(
        {
          patientId: patientId || undefined,
          status: status === "all" ? undefined : status,
          from,
          to,
          limit: 200,
        },
        { signal },
      ),
    `sessions-overview:${patientId}:${status}:${from ?? ""}:${to ?? ""}`,
  );

  const {
    data: appointments,
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useApiQuery(
    (signal) => appointmentsService.list({}, { signal }),
    "sessions-appointments",
  );

  const editingPatientId = editingSession?.patientId ?? "";
  const {
    data: editingSales,
    error: editingSalesError,
    isLoading: editingSalesLoading,
    refetch: refetchEditingSales,
  } = useApiQuery(
    (signal) => salesService.listByPatient(editingPatientId, { signal }),
    `sessions-edit-sales:${editingPatientId}`,
    { enabled: Boolean(editingPatientId) },
  );

  const appointmentsById = useMemo(
    () =>
      new Map(
        (appointments ?? []).map((appointment) => [
          appointment.id,
          appointment,
        ]),
      ),
    [appointments],
  );

  const editingAppointments = useMemo(
    () =>
      (appointments ?? []).filter(
        (appointment) => appointment.patientId === editingPatientId,
      ),
    [appointments, editingPatientId],
  );

  const stats = data?.stats;
  const sessions = data?.sessions ?? [];
  const hasFilters = Boolean(
    patientId || fromDate || toDate || status !== "all",
  );
  const completionRate =
    stats && stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  function clearFilters() {
    setPatientId("");
    setFromDate("");
    setToDate("");
    setStatus("all");
  }

  function retry() {
    refetch();
    refetchAppointments();
    refetchEditingSales();
    setOpportunitiesRefreshKey((current) => current + 1);
  }

  async function handleStatusChange(
    session: SessionOverviewItem,
    nextStatus: SessionStatus,
  ) {
    const currentStatus =
      session.status === "in_progress" || session.status === "cancelled"
        ? session.status
        : "completed";

    if (currentStatus === nextStatus) {
      return;
    }

    setUpdatingId(session.id);
    const toastId = toast.loading("Atualizando status da sessão…");

    try {
      await sessionsService.update(session.id, { status: nextStatus });
      toast.success("Status da sessão atualizado.", { id: toastId });
      retry();
    } catch (updateError) {
      toast.error(getErrorMessage(updateError), { id: toastId });
    } finally {
      setUpdatingId(null);
    }
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
        description="Acompanhe indicadores de atendimento e consulte o histórico de sessões por paciente, status e período."
        actions={createAction}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>
            Refine o painel por paciente, status da sessão e período de
            realização.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="session-patient">Paciente</FieldLabel>
              <div className="flex gap-2">
                <PatientCombobox
                  id="session-patient"
                  value={patientId}
                  placeholder="Todas as pacientes"
                  onChange={setPatientId}
                />
                {patientId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => setPatientId("")}
                    aria-label="Remover filtro de paciente"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="session-status">Status da sessão</FieldLabel>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as SessionStatus | "all")
                }
              >
                <SelectTrigger id="session-status" className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {SESSION_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="session-from">De</FieldLabel>
              <Input
                id="session-from"
                type="date"
                className="h-11"
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
                className="h-11"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {stats
                ? `${stats.total} ${
                    stats.total === 1 ? "sessão" : "sessões"
                  } no recorte atual`
                : "Carregando indicadores…"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <X className="size-4" />
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <SessionOpportunities
        refreshKey={opportunitiesRefreshKey}
        canSchedule={canSchedule}
      />

      {isLoading && !data ? (
        <SessionsSkeleton />
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar as sessões</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button type="button" size="sm" onClick={retry}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : stats && data ? (
        <>
          <section aria-labelledby="session-kpis" className="space-y-3">
            <h2 id="session-kpis" className="text-lg font-semibold">
              Indicadores de sessões
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Total de sessões"
                value={stats.total}
                detail="Todos os status do recorte"
                icon={ClipboardList}
                active={status === "all"}
                onClick={() => setStatus("all")}
              />
              <MetricCard
                label="Concluídas"
                value={stats.completed}
                detail={`${completionRate}% de conclusão`}
                icon={CircleCheck}
                tone="completed"
                active={status === "completed"}
                onClick={() =>
                  setStatus((current) =>
                    current === "completed" ? "all" : "completed",
                  )
                }
              />
              <MetricCard
                label="Em andamento"
                value={stats.inProgress}
                detail="Aguardando conclusão"
                icon={Clock}
                tone="progress"
                active={status === "in_progress"}
                onClick={() =>
                  setStatus((current) =>
                    current === "in_progress" ? "all" : "in_progress",
                  )
                }
              />
              <MetricCard
                label="Canceladas"
                value={stats.cancelled}
                detail="Não consomem saldo do pacote"
                icon={CircleX}
                tone="cancelled"
                active={status === "cancelled"}
                onClick={() =>
                  setStatus((current) =>
                    current === "cancelled" ? "all" : "cancelled",
                  )
                }
              />
              <MetricCard
                label="Pacientes atendidas"
                value={stats.patients}
                detail="Pacientes distintas no recorte"
                icon={Users}
                tone="patients"
              />
            </div>
          </section>

          <StatusDistribution stats={stats} />

          <section aria-labelledby="session-history" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="session-history" className="text-lg font-semibold">
                Histórico de sessões
              </h2>
              <Badge variant="secondary">
                {sessions.length}{" "}
                {sessions.length === 1 ? "sessão listada" : "sessões listadas"}
              </Badge>
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <CalendarClock className="size-6" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">
                    {hasFilters
                      ? "Nenhuma sessão corresponde aos filtros"
                      : "Nenhuma sessão registrada"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hasFilters
                      ? "Ajuste o paciente, o período ou o status selecionado."
                      : canWrite
                        ? "Registre a primeira sessão para começar o acompanhamento."
                        : "Ainda não há sessões registradas."}
                  </p>
                </div>
                {hasFilters ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                  >
                    <X className="size-4" />
                    Limpar filtros
                  </Button>
                ) : canWrite ? (
                  <Button asChild size="sm">
                    <Link href="/sessions/new">
                      <Plus className="size-4" />
                      Nova sessão
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    appointment={
                      session.appointmentId
                        ? appointmentsById.get(session.appointmentId)
                        : undefined
                    }
                    canWrite={canWrite}
                    isUpdating={updatingId === session.id}
                    onEdit={setEditingSession}
                    onStatusChange={(nextStatus) =>
                      handleStatusChange(session, nextStatus)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      <EditSessionDialog
        session={editingSession}
        open={Boolean(editingSession)}
        onOpenChange={(open) => {
          if (!open) setEditingSession(null);
        }}
        appointments={editingAppointments}
        sales={editingSales ?? []}
        isLoadingAppointments={appointmentsLoading}
        isLoadingSales={editingSalesLoading}
        salesError={editingSalesError}
        canCreateSale={canCreateSale}
        newSaleHref={
          editingPatientId
            ? `/sales/new?patientId=${encodeURIComponent(editingPatientId)}`
            : undefined
        }
        onRetrySales={refetchEditingSales}
        onSuccess={retry}
      />
    </div>
  );
}
