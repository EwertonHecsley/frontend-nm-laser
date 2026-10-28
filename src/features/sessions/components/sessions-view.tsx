"use client";

import {
  AlertTriangle,
  CalendarClock,
  CircleCheck,
  CircleX,
  ClipboardList,
  Clock,
  Plus,
  RefreshCw,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import { EditSessionDialog } from "@/features/sessions/components/edit-session-dialog";
import { SessionGroupCard } from "@/features/sessions/components/session-group-card";
import { SessionOpportunities } from "@/features/sessions/components/session-opportunities";
import {
  SESSION_STATUS_OPTIONS,
  groupSessionsByTreatment,
} from "@/features/sessions/utils";
import { useApiQuery, usePagination } from "@/hooks";
import { toEndOfDayIso, toStartOfDayIso } from "@/lib/format/date";
import {
  appointmentsService,
  packagesService,
  salesService,
  sessionsService,
} from "@/services";
import type {
  SessionOverviewItem,
  SessionOverviewStats,
  SessionStatus,
} from "@/types";

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
          {stats.total}{" "}
          {stats.total === 1 ? "sessão individual" : "sessões individuais"} no
          recorte filtrado.
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
  const [packageName, setPackageName] = useState("all");
  const [editingSession, setEditingSession] =
    useState<SessionOverviewItem | null>(null);

  const from = toStartOfDayIso(fromDate);
  const to = toEndOfDayIso(toDate);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) =>
      sessionsService.overview(
        {
          patientId: patientId || undefined,
          from,
          to,
          limit: 500,
        },
        { signal },
      ),
    `sessions-overview:${patientId}:${from ?? ""}:${to ?? ""}`,
  );

  const {
    data: appointments,
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useApiQuery(
    (signal) => appointmentsService.list({}, { signal }),
    "sessions-appointments",
  );

  const { data: packages } = useApiQuery(
    (signal) => packagesService.list({ signal }),
    "sessions-packages",
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

  const editingAppointments = useMemo(
    () =>
      (appointments ?? []).filter(
        (appointment) => appointment.patientId === editingPatientId,
      ),
    [appointments, editingPatientId],
  );

  const stats = data?.stats;
  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const packageFilteredSessions = useMemo(
    () =>
      packageName === "all"
        ? sessions
        : sessions.filter((session) => session.packageName === packageName),
    [packageName, sessions],
  );
  const sessionGroups = useMemo(
    () => groupSessionsByTreatment(packageFilteredSessions),
    [packageFilteredSessions],
  );
  const treatmentCount = sessionGroups.length;
  const filteredGroups = useMemo(
    () =>
      status === "all"
        ? sessionGroups
        : sessionGroups.filter((group) =>
            group.sessions.some(
              (session) =>
                (session.status === "in_progress" ||
                session.status === "cancelled"
                  ? session.status
                  : "completed") === status,
            ),
          ),
    [sessionGroups, status],
  );
  const packageStats = useMemo<SessionOverviewStats | undefined>(() => {
    if (packageName === "all" || !stats) {
      return stats;
    }

    let completed = 0;
    let inProgress = 0;
    let cancelled = 0;
    const patientIds = new Set<string>();

    for (const session of packageFilteredSessions) {
      patientIds.add(session.patientId);

      if (session.status === "in_progress") {
        inProgress += 1;
      } else if (session.status === "cancelled") {
        cancelled += 1;
      } else {
        completed += 1;
      }
    }

    return {
      total: packageFilteredSessions.length,
      completed,
      inProgress,
      cancelled,
      patients: patientIds.size,
    };
  }, [packageFilteredSessions, packageName, stats]);
  const displayStats = packageStats;
  const { pageItems, page, totalItems, setPage } = usePagination(
    filteredGroups,
    { resetKey: `${patientId}:${status}:${fromDate}:${toDate}:${packageName}` },
  );
  const packageOptions = useMemo(
    () =>
      [...(packages ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
    [packages],
  );
  const hasFilters = Boolean(
    patientId || fromDate || toDate || status !== "all" || packageName !== "all",
  );
  const completionRate =
    displayStats && displayStats.total > 0
      ? Math.round((displayStats.completed / displayStats.total) * 100)
      : 0;

  function clearFilters() {
    setPatientId("");
    setFromDate("");
    setToDate("");
    setStatus("all");
    setPackageName("all");
  }

  function retry() {
    refetch();
    refetchAppointments();
    refetchEditingSales();
    setOpportunitiesRefreshKey((current) => current + 1);
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
            Refine o painel por paciente, pacote, status da sessão e período de
            realização.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
              <FieldLabel htmlFor="session-package">Pacote</FieldLabel>
              <Select value={packageName} onValueChange={setPackageName}>
                <SelectTrigger id="session-package" className="h-11 w-full">
                  <SelectValue placeholder="Todos os pacotes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pacotes</SelectItem>
                  {packageOptions.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.name}>
                      {pkg.name}
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
              {displayStats
                ? `${treatmentCount} ${
                    treatmentCount === 1
                      ? "tratamento pessoal"
                      : "tratamentos pessoais"
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
        canWrite={canWrite}
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
      ) : displayStats && data ? (
        <>
          <section aria-labelledby="session-kpis" className="space-y-3">
            <h2 id="session-kpis" className="text-lg font-semibold">
              Indicadores de sessões
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Total de tratamentos pessoais"
                value={treatmentCount}
                detail="Tratamentos com sessões individuais no recorte"
                icon={ClipboardList}
                active={status === "all"}
                onClick={() => setStatus("all")}
              />
              <MetricCard
                label="Concluídas"
                value={displayStats.completed}
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
                value={displayStats.inProgress}
                detail="Paciente em tratamento no momento"
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
                value={displayStats.cancelled}
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
                value={displayStats.patients}
                detail="Pacientes distintas no recorte"
                icon={Users}
                tone="patients"
              />
            </div>
          </section>

          <StatusDistribution stats={displayStats} />

          <section aria-labelledby="session-history" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <h2 id="session-history" className="text-lg font-semibold">
                  Tratamentos pessoais
                </h2>
                <p className="text-sm text-muted-foreground">
                  Cada tratamento reúne as sessões individuais de um pacote
                  contratado.
                </p>
              </div>
              <Badge variant="secondary">
                {filteredGroups.length}{" "}
                {filteredGroups.length === 1
                  ? "tratamento pessoal listado"
                  : "tratamentos pessoais listados"}
              </Badge>
            </div>

            {filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <CalendarClock className="size-6" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">
                    {hasFilters
                      ? "Nenhum tratamento pessoal corresponde aos filtros"
                      : "Nenhum tratamento pessoal registrado"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {hasFilters
                      ? "Ajuste o paciente, o período ou o status selecionado."
                      : canWrite
                        ? "Registre a primeira sessão para criar o tratamento pessoal do pacote."
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
                {pageItems.map((group) => (
                  <SessionGroupCard key={group.id} group={group} />
                ))}
                <Pagination
                  page={page}
                  totalItems={totalItems}
                  onPageChange={setPage}
                />
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
