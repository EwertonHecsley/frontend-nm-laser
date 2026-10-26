"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  CircleDollarSign,
  MessageCircle,
  Plus,
  RefreshCw,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  SaleCard,
} from "@/features/sales/components/sale-card";
import { useApiQuery } from "@/hooks";
import { formatDate } from "@/lib/format/date";
import { onlyDigits } from "@/lib/security/sanitize";
import { formatPhone } from "@/features/patients/utils";
import { salesService } from "@/services";
import type { Sale, SaleListFilters } from "@/types";

type PeriodPreset =
  | "thisMonth"
  | "last30Days"
  | "last90Days"
  | "thisYear"
  | "all";

const PERIOD_OPTIONS: readonly { value: PeriodPreset; label: string }[] = [
  { value: "thisMonth", label: "Este mês" },
  { value: "last30Days", label: "Últimos 30 dias" },
  { value: "last90Days", label: "Últimos 90 dias" },
  { value: "thisYear", label: "Este ano" },
  { value: "all", label: "Todo o período" },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

interface VendorClient {
  id: string;
  fullName: string;
  whatsapp: string | null;
  cityName: string | null;
  purchases: number;
  totalSpent: number;
  lastPurchaseAt: string;
  remainingSessions: number;
}

interface VendorClientView extends VendorClient {
  daysSinceLastPurchase: number;
  reasons: string[];
  priority: number;
}

function getPeriodFilters(preset: PeriodPreset): SaleListFilters {
  if (preset === "all") {
    return {};
  }

  const today = new Date();
  const from = new Date(today);
  const to = new Date(today);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  if (preset === "thisMonth") {
    from.setDate(1);
  } else if (preset === "last30Days") {
    from.setDate(from.getDate() - 29);
  } else if (preset === "last90Days") {
    from.setDate(from.getDate() - 89);
  } else {
    from.setMonth(0, 1);
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

function toAmount(value: string | null | undefined): number {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount : 0;
}

function aggregateClients(sales: Sale[]): VendorClient[] {
  const byPatient = new Map<string, VendorClient>();

  for (const sale of sales) {
    if (!sale.patient) {
      continue;
    }

    const total = toAmount(sale.value) - toAmount(sale.discount);
    const remaining = sale.areas.reduce(
      (sum, area) => sum + area.remaining,
      0,
    );
    const existing = byPatient.get(sale.patient.id);

    if (!existing) {
      byPatient.set(sale.patient.id, {
        id: sale.patient.id,
        fullName: sale.patient.fullName,
        whatsapp: sale.patient.whatsapp,
        cityName: sale.city?.name ?? null,
        purchases: 1,
        totalSpent: Math.max(0, total),
        lastPurchaseAt: sale.createdAt,
        remainingSessions: remaining,
      });
      continue;
    }

    existing.purchases += 1;
    existing.totalSpent += Math.max(0, total);
    existing.remainingSessions += remaining;

    if (
      new Date(sale.createdAt).getTime() >
      new Date(existing.lastPurchaseAt).getTime()
    ) {
      existing.lastPurchaseAt = sale.createdAt;
      existing.cityName = sale.city?.name ?? existing.cityName;
      existing.whatsapp = sale.patient.whatsapp ?? existing.whatsapp;
    }
  }

  return [...byPatient.values()];
}

function prioritizeClients(clients: VendorClient[]): VendorClientView[] {
  const now = Date.now();

  return clients
    .map((client) => {
      const daysSinceLastPurchase = Math.max(
        0,
        Math.floor(
          (now - new Date(client.lastPurchaseAt).getTime()) / DAY_IN_MS,
        ),
      );
      const reasons: string[] = [];

      if (client.remainingSessions === 0) {
        reasons.push("Sem sessões restantes");
      } else if (client.remainingSessions <= 2) {
        reasons.push("Pacote quase acabando");
      }

      if (daysSinceLastPurchase >= 30) {
        reasons.push(`Sem comprar há ${daysSinceLastPurchase} dias`);
      }

      const priority =
        (client.remainingSessions <= 2 ? 2 : 0) +
        (daysSinceLastPurchase >= 30 ? 1 : 0);

      return {
        ...client,
        daysSinceLastPurchase,
        reasons,
        priority,
      };
    })
    .sort((a, b) => {
      const priorityDifference = b.priority - a.priority;

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const aTime = new Date(a.lastPurchaseAt).getTime();
      const bTime = new Date(b.lastPurchaseAt).getTime();

      return a.priority > 0 ? aTime - bTime : bTime - aTime;
    });
}

function getWhatsAppHref(client: VendorClientView): string | null {
  const digits = onlyDigits(client.whatsapp ?? "");

  if (!digits) {
    return null;
  }

  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const message =
    client.priority > 0
      ? `Olá, ${client.fullName}! Tudo bem? Estou entrando em contato para conversar sobre a renovação do seu pacote e novas opções de tratamento.`
      : `Olá, ${client.fullName}! Tudo bem? Estou à disposição para conversar sobre novas opções de tratamento e pacotes.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof ShoppingCart;
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

function ClientCard({ client }: { client: VendorClientView }) {
  const whatsappHref = getWhatsAppHref(client);

  return (
    <Card size="sm">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium">{client.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {client.cityName ?? "Cidade não informada"} ·{" "}
              {formatPhone(client.whatsapp)}
            </p>
          </div>

          {whatsappHref ? (
            <Button asChild size="sm">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" disabled>
              <MessageCircle className="size-4" />
              Sem WhatsApp
            </Button>
          )}
        </div>

        {client.reasons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {client.reasons.map((reason) => (
              <Badge key={reason} variant="secondary" className="gap-1">
                <Sparkles className="size-3" />
                {reason}
              </Badge>
            ))}
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Compras</dt>
            <dd className="font-medium tabular-nums">{client.purchases}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total investido</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(client.totalSpent.toFixed(2))}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Última compra</dt>
            <dd className="font-medium">{formatDate(client.lastPurchaseAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">
              Sessões restantes
            </dt>
            <dd className="font-medium tabular-nums">
              {client.remainingSessions}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function SalesVendorDashboard({ canWrite }: { canWrite: boolean }) {
  const [periodPreset, setPeriodPreset] =
    useState<PeriodPreset>("thisMonth");
  const [showAllSales, setShowAllSales] = useState(false);
  const periodFilters = useMemo(
    () => getPeriodFilters(periodPreset),
    [periodPreset],
  );

  const {
    data: allSales,
    error: salesError,
    isLoading: isLoadingSales,
    refetch: refetchSales,
  } = useApiQuery(
    (signal) => salesService.list({}, { signal }),
    "vendor-sales-clients",
  );

  const {
    data: summary,
    error: summaryError,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useApiQuery(
    (signal) => salesService.summary(periodFilters, { signal }),
    `vendor-sales-summary:${periodPreset}:${periodFilters.from ?? ""}:${periodFilters.to ?? ""}`,
  );

  const clients = useMemo(
    () => prioritizeClients(aggregateClients(allSales ?? [])),
    [allSales],
  );
  const recentSales = useMemo(
    () =>
      [...(allSales ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [allSales],
  );
  const visibleSales = showAllSales ? recentSales : recentSales.slice(0, 5);

  const error = salesError ?? summaryError;
  const isLoading = isLoadingSales || isLoadingSummary;
  const opportunityCount = clients.filter(
    (client) => client.priority > 0,
  ).length;
  const averageTicket =
    summary && summary.salesCount > 0
      ? String(Number(summary.revenue) / summary.salesCount)
      : null;

  function refetchAll() {
    refetchSales();
    refetchSummary();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo das minhas vendas</CardTitle>
          <CardDescription>
            A carteira de clientes considera todo o histórico de vendas; o
            resumo abaixo segue o período selecionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field className="max-w-xs">
            <FieldLabel htmlFor="vendor-sales-period">Período</FieldLabel>
            <Select
              value={periodPreset}
              onValueChange={(value) =>
                setPeriodPreset(value as PeriodPreset)
              }
            >
              <SelectTrigger id="vendor-sales-period" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar suas vendas</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button type="button" size="sm" onClick={refetchAll}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : isLoading || !summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Vendas no período"
              value={String(summary.salesCount)}
              detail="Vendas registradas por você no período"
              icon={ShoppingCart}
            />
            <MetricCard
              label="Faturamento"
              value={formatCurrency(summary.revenue)}
              detail="Valor das vendas menos descontos"
              icon={CircleDollarSign}
            />
            <MetricCard
              label="Ticket médio"
              value={averageTicket ? formatCurrency(averageTicket) : "—"}
              detail="Faturamento dividido pela quantidade de vendas"
              icon={BadgeDollarSign}
            />
            <MetricCard
              label="Oportunidades de contato"
              value={String(opportunityCount)}
              detail="Clientes da carteira com pacote acabando ou sem comprar há 30 dias"
              icon={Sparkles}
            />
          </div>

          <section aria-labelledby="vendor-sales-clients" className="space-y-3">
            <div className="space-y-1">
              <h2 id="vendor-sales-clients" className="text-lg font-semibold">
                Clientes que compraram
              </h2>
              <p className="text-sm text-muted-foreground">
                {clients.length} cliente{clients.length === 1 ? "" : "s"} na
                carteira. As prioridades de contato aparecem primeiro.
              </p>
            </div>

            {clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <BadgeDollarSign className="size-6" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">Nenhuma venda registrada</p>
                  <p className="text-sm text-muted-foreground">
                    Registre sua primeira venda para acompanhar seus clientes.
                  </p>
                </div>
                {canWrite && (
                  <Button asChild size="sm">
                    <Link href="/sales/new">
                      <Plus className="size-4" />
                      Nova venda
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {clients.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            )}
          </section>

          {recentSales.length > 0 && (
            <section aria-labelledby="vendor-sales-history" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1">
                  <h2
                    id="vendor-sales-history"
                    className="text-lg font-semibold"
                  >
                    Vendas recentes
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Últimos registros das suas vendas, com acesso à edição.
                  </p>
                </div>
                {recentSales.length > 5 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAllSales((current) => !current)}
                  >
                    {showAllSales
                      ? "Mostrar menos"
                      : `Ver todas (${recentSales.length})`}
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {visibleSales.map((sale) => (
                  <SaleCard key={sale.id} sale={sale} canWrite={canWrite} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
