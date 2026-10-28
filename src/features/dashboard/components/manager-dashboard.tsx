"use client";

import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  RefreshCw,
  Users,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks";
import { formatCurrency } from "@/lib/format/currency";
import { toEndOfDayIso, toStartOfDayIso } from "@/lib/format/date";
import { reportsService } from "@/services/reports.service";
import { salesService } from "@/services/sales.service";
import Link from "next/link";
import type { Appointment, AppointmentStatus } from "@/types";

const STATUS_ITEMS: Array<{
  status: AppointmentStatus;
  label: string;
  color: string;
}> = [
  { status: "performed", label: "Realizados", color: "bg-emerald-600" },
  { status: "scheduled", label: "Agendados", color: "bg-sky-600" },
  { status: "missed", label: "Faltas", color: "bg-rose-600" },
  { status: "cancelled", label: "Cancelados", color: "bg-slate-500" },
  { status: "arrived", label: "Chegaram", color: "bg-violet-600" },
  { status: "rescheduled", label: "Remarcados", color: "bg-amber-500" },
];

function getDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function initialPeriod(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return { from: getDateInputValue(from), to: getDateInputValue(to) };
}

function getPresetRange(preset: string): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today);
  let to = new Date(today);

  if (preset === "last7Days") {
    from.setDate(from.getDate() - 6);
  } else if (preset === "thisMonth") {
    from.setDate(1);
    to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (preset === "lastMonth") {
    from.setDate(1);
    from.setMonth(from.getMonth() - 1);
    to = new Date(today.getFullYear(), today.getMonth(), 0);
  }

  return { from: getDateInputValue(from), to: getDateInputValue(to) };
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function buildAppointmentFlow(
  appointments: Appointment[],
  from: string,
  to: string,
): Array<{ label: string; count: number }> {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return [];
  }

  const weekly = (end.getTime() - start.getTime()) / 86_400_000 > 30;
  const buckets: Array<{ start: Date; count: number }> = [];
  const bucketByDate = new Map<string, number>();
  const cursor = new Date(start);

  while (cursor <= end) {
    buckets.push({ start: new Date(cursor), count: 0 });
    cursor.setDate(cursor.getDate() + (weekly ? 7 : 1));
  }

  for (const appointment of appointments) {
    const date = new Date(appointment.scheduledAt);
    date.setHours(0, 0, 0, 0);
    const dayOffset = Math.floor(
      (date.getTime() - start.getTime()) / 86_400_000,
    );

    if (dayOffset < 0) {
      continue;
    }

    const index = Math.floor(dayOffset / (weekly ? 7 : 1));

    if (index < buckets.length) {
      const key = buckets[index]!.start.toISOString();
      bucketByDate.set(key, (bucketByDate.get(key) ?? 0) + 1);
    }
  }

  return buckets.map(({ start: bucketStart }) => ({
    label: formatShortDate(bucketStart),
    count: bucketByDate.get(bucketStart.toISOString()) ?? 0,
  }));
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail?: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        </div>
        <span className="grid size-10 place-items-center rounded-lg bg-secondary text-secondary-foreground">
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

function AppointmentFlowChart({
  appointments,
  from,
  to,
}: {
  appointments: Appointment[];
  from: string;
  to: string;
}) {
  const flow = buildAppointmentFlow(appointments, from, to);
  const maxCount = Math.max(1, ...flow.map(({ count }) => count));
  const intervalLabel =
    flow.length > 0 &&
    (new Date(`${to}T00:00:00`).getTime() -
      new Date(`${from}T00:00:00`).getTime()) /
      86_400_000 >
      30
      ? "semana"
      : "dia";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de agendamentos</CardTitle>
        <CardDescription>
          Quantidade por {intervalLabel} no período selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {flow.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Selecione um período válido para visualizar o gráfico.
          </p>
        ) : (
          <div
            className="flex min-h-44 items-end gap-1 overflow-x-auto pb-1"
            role="img"
            aria-label={`Fluxo de agendamentos por ${intervalLabel}`}
          >
            {flow.map(({ label, count }, index) => (
              <div
                key={`${label}-${index}`}
                className="flex min-w-8 flex-1 flex-col items-center justify-end gap-2"
                title={`${label}: ${count} agendamentos`}
              >
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {count || ""}
                </span>
                <div className="flex h-32 w-full items-end rounded-t bg-muted/60">
                  <div
                    className="w-full rounded-t bg-primary transition-[height]"
                    style={{
                      height: `${Math.max(3, (count / maxCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusDistribution({
  counts,
  total,
}: {
  counts: Record<AppointmentStatus, number>;
  total: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por status</CardTitle>
        <CardDescription>
          {total} agendamento{total === 1 ? "" : "s"} no período.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex h-3 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label="Distribuição proporcional dos agendamentos por status"
        >
          {STATUS_ITEMS.map(({ status, color }) => (
            <span
              key={status}
              className={color}
              style={{ width: `${total ? (counts[status] / total) * 100 : 0}%` }}
            />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {STATUS_ITEMS.map(({ status, label, color }) => (
            <li key={status} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className={`size-2.5 rounded-full ${color}`} />
                {label}
              </span>
              <span className="font-medium tabular-nums">{counts[status]}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ManagerDashboard() {
  const [period, setPeriod] = useState(initialPeriod);
  const from = toStartOfDayIso(period.from) ?? "";
  const to = toEndOfDayIso(period.to) ?? "";
  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => reportsService.getManagerReport(from, to, { signal }),
    `manager-report:${period.from}:${period.to}`,
    { enabled: Boolean(from && to && period.from <= period.to) },
  );
  const { data: allSales } = useApiQuery(
    (signal) => salesService.list({}, { signal }),
    "manager-pending-payments",
  );
  const pendingSales = (allSales ?? []).filter(
    (sale) => sale.paymentStatus === "open",
  );
  const pendingTotal = pendingSales.reduce(
    (total, sale) => total + Number(sale.value || 0),
    0,
  );
  const statusCounts = data?.appointmentCounts;
  const flowAppointments = useMemo(() => data?.appointments ?? [], [data]);
  const averageTicket =
    data && data.financial.salesCount > 0
      ? String(Number(data.financial.revenue) / data.financial.salesCount)
      : null;
  const periodActions = [
    { label: "Hoje", preset: "today" },
    { label: "Últimos 7 dias", preset: "last7Days" },
    { label: "Este mês", preset: "thisMonth" },
    { label: "Mês passado", preset: "lastMonth" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard gerencial"
        description="Indicadores consolidados de pacientes, agendamentos, sessões e situação financeira."
      />

      <Link href="/sales" className="block">
        <Card className="transition-colors hover:border-primary/40">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardDescription>Valores a receber</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {pendingTotal.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </CardTitle>
            </div>
            <span className="grid size-10 place-items-center rounded-lg bg-amber-500/10 text-amber-700">
              <CircleDollarSign className="size-5" aria-hidden="true" />
            </span>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {pendingSales.length} venda(s) com pagamento ainda não confirmado.
            Clique para ver os clientes pendentes.
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Período do relatório</CardTitle>
              <CardDescription>
                O intervalo é aplicado aos agendamentos e às sessões concluídas.
              </CardDescription>
            </div>
            <Badge variant="secondary">Gestora</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium" htmlFor="report-from">
              <span>De</span>
              <Input
                id="report-from"
                type="date"
                value={period.from}
                max={period.to}
                onChange={(event) =>
                  setPeriod((current) => ({
                    from: event.target.value,
                    to:
                      event.target.value > current.to
                        ? event.target.value
                        : current.to,
                  }))
                }
              />
            </label>
            <label className="space-y-2 text-sm font-medium" htmlFor="report-to">
              <span>Até</span>
              <Input
                id="report-to"
                type="date"
                value={period.to}
                min={period.from}
                onChange={(event) =>
                  setPeriod((current) => ({
                    from:
                      event.target.value < current.from
                        ? event.target.value
                        : current.from,
                    to: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Atalhos de período">
            {periodActions.map(({ label, preset }) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPeriod(getPresetRange(preset))}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar o relatório</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button type="button" size="sm" onClick={refetch}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <section aria-labelledby="report-kpis" className="space-y-3">
            <h2 id="report-kpis" className="text-lg font-semibold">
              Indicadores consolidados
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Pacientes cadastrados"
                value={data.patientCount}
                icon={Users}
              />
              <MetricCard
                label="Agendamentos no período"
                value={data.appointments.length}
                detail="Todos os status"
                icon={CalendarDays}
              />
              <MetricCard
                label="Realizados"
                value={statusCounts!.performed}
                icon={CalendarCheck2}
              />
              <MetricCard
                label="Agendamentos agendados"
                value={statusCounts!.scheduled}
                icon={CalendarDays}
              />
              <MetricCard
                label="Faltas"
                value={statusCounts!.missed}
                icon={CalendarDays}
              />
              <MetricCard
                label="Cancelados"
                value={statusCounts!.cancelled}
                icon={CalendarDays}
              />
              <MetricCard
                label="Sessões realizadas"
                value={data.completedSessionCount}
                detail="Sessões concluídas no período selecionado"
                icon={ClipboardCheck}
              />
            </div>
          </section>

          <section aria-labelledby="report-charts" className="space-y-3">
            <h2 id="report-charts" className="text-lg font-semibold">
              Relatórios de atendimento
            </h2>
            <div className="grid gap-4 xl:grid-cols-2">
              <AppointmentFlowChart
                appointments={flowAppointments}
                from={period.from}
                to={period.to}
              />
              <StatusDistribution
                counts={statusCounts!}
                total={data.appointments.length}
              />
            </div>
          </section>

          <section aria-labelledby="report-finance" className="space-y-3">
            <h2 id="report-finance" className="text-lg font-semibold">
              Faturamento
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription>Faturamento no período</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {formatCurrency(data.financial.revenue)}
                    </CardTitle>
                  </div>
                  <CircleDollarSign
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Valor das compras lançadas menos os descontos concedidos.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription>Compras lançadas</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {data.financial.salesCount}
                    </CardTitle>
                  </div>
                  <CircleDollarSign
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {data.financial.salesCount === 0
                    ? "Nenhuma compra registrada no período."
                    : `${formatCurrency(data.financial.totalDiscount)} em descontos no período.`}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription>Ticket médio</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">
                      {averageTicket ? formatCurrency(averageTicket) : "—"}
                    </CardTitle>
                  </div>
                  <CircleDollarSign
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Faturamento dividido pela quantidade de compras.
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
