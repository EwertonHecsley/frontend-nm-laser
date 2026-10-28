"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Layers,
  Package,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

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
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCpf, formatPhone } from "@/features/patients/utils";
import {
  SESSION_STATUS_BADGE_VARIANTS,
  getSessionStatusLabel,
  sortSessionsByPerformedAt,
} from "@/features/sessions/utils";
import { useApiQuery, usePagination } from "@/hooks";
import { formatCurrency } from "@/lib/format/currency";
import {
  formatDate,
  formatDateOnly,
  formatDateTime,
} from "@/lib/format/date";
import {
  citiesService,
  patientsService,
  salesService,
  sessionsService,
} from "@/services";
import type { Sale, SessionRecord } from "@/types";

const SESSION_PAGE_SIZE = 10;

function toAmount(value: string | null | undefined): number {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount : 0;
}

function saleRevenue(sale: Sale): number {
  return Math.max(0, toAmount(sale.value) - toAmount(sale.discount));
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ClipboardList;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardHeader>
    </Card>
  );
}

function SaleHistoryCard({
  sale,
  completedSessions,
}: {
  sale: Sale;
  completedSessions: number;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {sale.package?.name ?? "Pacote não identificado"}
            </CardTitle>
            <CardDescription>
              Contratado em {formatDate(sale.createdAt)} ·{" "}
              {sale.consultant?.name ?? "Consultora não informada"}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {formatCurrency(saleRevenue(sale).toFixed(2))}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">
              Faturamento do pacote
            </dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(saleRevenue(sale).toFixed(2))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Consultora que vendeu
            </dt>
            <dd className="font-medium">
              {sale.consultant?.name ?? "Não informada"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Sessões registradas
            </dt>
            <dd className="font-medium tabular-nums">{completedSessions}</dd>
          </div>
        </dl>

        {sale.areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este pacote não possui áreas com saldo.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Áreas contratadas
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {sale.areas.map((area) => (
                <li
                  key={area.areaId}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{area.areaName}</span>
                  <span className="text-xs text-muted-foreground">
                    {area.remaining} de {area.sessionsCount} restantes
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {toAmount(sale.discount) > 0 && (
          <p className="text-xs text-muted-foreground">
            Valor original {formatCurrency(sale.value)} · Desconto{" "}
            {formatCurrency(sale.discount)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SessionHistoryCard({
  session,
  sale,
}: {
  session: SessionRecord;
  sale: Sale | undefined;
}) {
  const status = session.status ?? "completed";
  const badgeVariant = SESSION_STATUS_BADGE_VARIANTS[status] ?? "default";

  return (
    <Card size="sm">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium">
              {formatDateTime(session.performedAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              Sessão {session.sessionNumber || "—"} · Pacote{" "}
              {sale?.package?.name ?? "não identificado"}
            </p>
          </div>
          <Badge variant={badgeVariant}>{getSessionStatusLabel(status)}</Badge>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            Áreas depiladas
          </p>
          {session.areas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma área registrada.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {session.areas.map((area) => (
                <Badge key={area.id} variant="secondary">
                  {area.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Consultora que vendeu:{" "}
          <span className="font-medium text-foreground">
            {sale?.consultant?.name ?? "Não informada"}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

export function PatientHistoryView({ patientId }: { patientId: string }) {
  const {
    data: patient,
    error: patientError,
    isLoading: isLoadingPatient,
    refetch: refetchPatient,
  } = useApiQuery(
    (signal) => patientsService.getById(patientId, { signal }),
    `patient-history-patient:${patientId}`,
  );

  const {
    data: salesData,
    error: salesError,
    isLoading: isLoadingSales,
    refetch: refetchSales,
  } = useApiQuery(
    (signal) => salesService.listByPatient(patientId, { signal }),
    `patient-history-sales:${patientId}`,
  );

  const {
    data: sessionsData,
    error: sessionsError,
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useApiQuery(
    (signal) =>
      sessionsService
        .overview({ patientId, limit: 500 }, { signal })
        .then(({ sessions }) => sessions),
    `patient-history-sessions:${patientId}`,
  );

  const { data: cities, isLoading: isLoadingCities } = useApiQuery(
    (signal) => citiesService.list({ signal }),
    "patient-history-cities",
  );

  const sales = useMemo(
    () =>
      [...(salesData ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [salesData],
  );
  const sessions = useMemo(
    () => sortSessionsByPerformedAt(sessionsData ?? []),
    [sessionsData],
  );
  const saleById = useMemo(
    () => new Map(sales.map((sale) => [sale.id, sale])),
    [sales],
  );
  const cityName = useMemo(
    () => (cities ?? []).find((city) => city.id === patient?.cityId)?.name,
    [cities, patient?.cityId],
  );
  const completedSessionsBySale = useMemo(() => {
    const counts = new Map<string, number>();

    for (const session of sessions) {
      if (!session.saleId || session.status === "cancelled") {
        continue;
      }

      counts.set(session.saleId, (counts.get(session.saleId) ?? 0) + 1);
    }

    return counts;
  }, [sessions]);

  const totalRevenue = useMemo(
    () => sales.reduce((sum, sale) => sum + saleRevenue(sale), 0),
    [sales],
  );
  const completedSessions = useMemo(
    () => sessions.filter((session) => session.status !== "cancelled").length,
    [sessions],
  );
  const lastSessionAt = sessions[0]?.performedAt ?? null;

  const {
    pageItems: sessionPageItems,
    page: sessionsPage,
    totalItems: sessionsTotalItems,
    setPage: setSessionsPage,
  } = usePagination(sessions, {
    pageSize: SESSION_PAGE_SIZE,
    resetKey: patientId,
  });

  const error = patientError ?? salesError ?? sessionsError;
  const isLoading =
    isLoadingPatient || isLoadingSales || isLoadingSessions || isLoadingCities;

  function refetchAll() {
    refetchPatient();
    refetchSales();
    refetchSessions();
  }

  const backAction = (
    <Button asChild variant="outline">
      <Link href="/patients">
        <ArrowLeft className="size-4" />
        Voltar para pacientes
      </Link>
    </Button>
  );

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Histórico do cliente"
          description="Não foi possível carregar os dados deste cliente."
          actions={backAction}
        />
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Falha ao carregar o histórico</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button type="button" size="sm" onClick={refetchAll}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading || !patient) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Histórico do cliente"
          description="Carregando histórico completo do cliente."
          actions={backAction}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.fullName}
        description="Histórico completo de pacotes contratados, faturamento, sessões e áreas depiladas."
        actions={backAction}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4" aria-hidden="true" />
            Dados do cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">CPF</dt>
              <dd className="text-sm font-medium">{formatCpf(patient.cpf)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nascimento</dt>
              <dd className="text-sm font-medium">
                {formatDateOnly(patient.birthDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Cidade</dt>
              <dd className="text-sm font-medium">
                {cityName ?? "Não informada"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">WhatsApp</dt>
              <dd className="text-sm font-medium">
                {formatPhone(patient.whatsapp)}
              </dd>
            </div>
            <div className="sm:col-span-2 xl:col-span-3">
              <dt className="text-xs text-muted-foreground">Endereço</dt>
              <dd className="text-sm font-medium">
                {patient.address?.trim() || "Não informado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Cliente desde</dt>
              <dd className="text-sm font-medium">
                {formatDate(patient.createdAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pacotes contratados"
          value={String(sales.length)}
          detail="Total de pacotes vendidos para este cliente"
          icon={Package}
        />
        <MetricCard
          label="Faturamento total"
          value={formatCurrency(totalRevenue.toFixed(2))}
          detail="Soma dos pacotes menos descontos"
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Sessões registradas"
          value={String(completedSessions)}
          detail="Sessões concluídas ou em andamento"
          icon={ClipboardList}
        />
        <MetricCard
          label="Última sessão"
          value={lastSessionAt ? formatDate(lastSessionAt) : "—"}
          detail={
            lastSessionAt
              ? formatDateTime(lastSessionAt)
              : "Nenhuma sessão registrada"
          }
          icon={CalendarDays}
        />
      </div>

      <section aria-labelledby="patient-history-sales" className="space-y-3">
        <div className="space-y-1">
          <h2
            id="patient-history-sales"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Sparkles className="size-5" aria-hidden="true" />
            Pacotes contratados
          </h2>
          <p className="text-sm text-muted-foreground">
            Pacotes, áreas, faturamento e consultora responsável por cada venda.
          </p>
        </div>

        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Package className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Nenhum pacote contratado</p>
              <p className="text-sm text-muted-foreground">
                Este cliente ainda não possui vendas registradas.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sales.map((sale) => (
              <SaleHistoryCard
                key={sale.id}
                sale={sale}
                completedSessions={completedSessionsBySale.get(sale.id) ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="patient-history-sessions" className="space-y-3">
        <div className="space-y-1">
          <h2
            id="patient-history-sessions"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Layers className="size-5" aria-hidden="true" />
            Histórico de sessões
          </h2>
          <p className="text-sm text-muted-foreground">
            {sessions.length} sessão{sessions.length === 1 ? "" : "ões"}{" "}
            registrada{sessions.length === 1 ? "" : "s"} para este cliente.
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <ClipboardList className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="font-medium">Nenhuma sessão registrada</p>
              <p className="text-sm text-muted-foreground">
                As sessões realizadas aparecerão aqui com data, áreas e pacote.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">
              {sessionPageItems.map((session) => (
                <SessionHistoryCard
                  key={session.id}
                  session={session}
                  sale={
                    session.saleId
                      ? saleById.get(session.saleId)
                      : undefined
                  }
                />
              ))}
            </div>
            <Pagination
              page={sessionsPage}
              totalItems={sessionsTotalItems}
              pageSize={SESSION_PAGE_SIZE}
              onPageChange={setSessionsPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
