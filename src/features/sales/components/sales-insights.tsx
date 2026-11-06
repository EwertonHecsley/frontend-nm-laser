"use client";

import {
  ChevronRight,
  Crown,
  Layers,
  Package,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";
import type { Sale } from "@/types";

interface ClientRankingItem {
  id: string;
  name: string;
  cityName: string | null;
  purchases: number;
  revenue: number;
  lastPurchaseAt: string;
  lastPurchaseValue: number;
  lastPackageName: string | null;
}

interface PackageRankingItem {
  id: string;
  name: string;
  salesCount: number;
  revenue: number;
}

interface AreaRankingItem {
  id: string;
  name: string;
  sessionsCount: number;
  salesCount: number;
}

function toAmount(value: string | null | undefined): number {
  const amount = Number(value ?? 0);

  return Number.isFinite(amount) ? amount : 0;
}

function toRevenue(sale: Sale): number {
  return Math.max(0, toAmount(sale.value) - toAmount(sale.discount));
}

function buildClientRanking(sales: Sale[]): ClientRankingItem[] {
  const byPatient = new Map<string, ClientRankingItem>();

  for (const sale of sales) {
    if (!sale.patient) {
      continue;
    }

    const existing = byPatient.get(sale.patient.id);

    if (!existing) {
      byPatient.set(sale.patient.id, {
        id: sale.patient.id,
        name: sale.patient.fullName,
        cityName: sale.city?.name ?? null,
        purchases: 1,
        revenue: toRevenue(sale),
        lastPurchaseAt: sale.createdAt,
        lastPurchaseValue: toRevenue(sale),
        lastPackageName: sale.package?.name ?? null,
      });
      continue;
    }

    existing.purchases += 1;
    existing.revenue += toRevenue(sale);
    existing.cityName = existing.cityName ?? sale.city?.name ?? null;

    if (
      new Date(sale.createdAt).getTime() >
      new Date(existing.lastPurchaseAt).getTime()
    ) {
      existing.lastPurchaseAt = sale.createdAt;
      existing.lastPurchaseValue = toRevenue(sale);
      existing.lastPackageName = sale.package?.name ?? null;
    }
  }

  return [...byPatient.values()].sort(
    (a, b) => b.revenue - a.revenue || b.purchases - a.purchases,
  );
}

function buildPackageRanking(sales: Sale[]): PackageRankingItem[] {
  const byPackage = new Map<string, PackageRankingItem>();

  for (const sale of sales) {
    if (!sale.package) {
      continue;
    }

    const existing = byPackage.get(sale.package.id);

    if (!existing) {
      byPackage.set(sale.package.id, {
        id: sale.package.id,
        name: sale.package.name,
        salesCount: 1,
        revenue: toRevenue(sale),
      });
      continue;
    }

    existing.salesCount += 1;
    existing.revenue += toRevenue(sale);
  }

  return [...byPackage.values()].sort(
    (a, b) => b.salesCount - a.salesCount || b.revenue - a.revenue,
  );
}

function buildAreaRanking(sales: Sale[]): AreaRankingItem[] {
  const byArea = new Map<string, AreaRankingItem>();

  for (const sale of sales) {
    for (const area of sale.areas) {
      const existing = byArea.get(area.areaId);

      if (!existing) {
        byArea.set(area.areaId, {
          id: area.areaId,
          name: area.areaName,
          sessionsCount: area.sessionsCount,
          salesCount: 1,
        });
        continue;
      }

      existing.sessionsCount += area.sessionsCount;
      existing.salesCount += 1;
    }
  }

  return [...byArea.values()].sort(
    (a, b) =>
      b.sessionsCount - a.sessionsCount || b.salesCount - a.salesCount,
  );
}

function HighlightCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Trophy;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="truncate text-lg">{value}</CardTitle>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground shadow-sm">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
    </Card>
  );
}

function RankedRow({
  position,
  title,
  subtitle,
  value,
  onSelect,
}: {
  position: number;
  title: string;
  subtitle: string;
  value: string;
  onSelect?: () => void;
}) {
  const content = (
    <>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums">
        {position}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
      <span className="shrink-0 text-sm font-medium tabular-nums">{value}</span>
      {onSelect && (
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      )}
    </>
  );

  if (onSelect) {
    return (
      <li>
        <button
          type="button"
          onClick={onSelect}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border px-3 py-2">
      {content}
    </li>
  );
}

export function SalesInsights({
  sales,
  description,
}: {
  sales: Sale[];
  description?: string;
}) {
  const [selectedClient, setSelectedClient] =
    useState<ClientRankingItem | null>(null);
  const data = useMemo(() => {
    const clients = buildClientRanking(sales);
    const packages = buildPackageRanking(sales);
    const areas = buildAreaRanking(sales);

    return {
      clients,
      packages,
      areas,
      topClients: clients.slice(0, 10),
      topPackages: packages.slice(0, 5),
      topAreas: areas.slice(0, 5),
    };
  }, [sales]);

  if (sales.length === 0) {
    return null;
  }

  const bestClient = data.clients[0];
  const bestPackage = data.packages[0];
  const bestArea = data.areas[0];

  return (
    <section aria-labelledby="sales-insights" className="space-y-3">
      <div className="space-y-1">
        <h2 id="sales-insights" className="text-lg font-semibold">
          Melhores clientes e produtos
        </h2>
        <p className="text-sm text-muted-foreground">
          {description ??
            "Destaques de clientes, pacotes e áreas com base nas vendas filtradas."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <HighlightCard
          label="Melhor cliente"
          value={bestClient?.name ?? "—"}
          detail={
            bestClient
              ? `${formatCurrency(bestClient.revenue.toFixed(2))} · ${bestClient.purchases} compra${bestClient.purchases === 1 ? "" : "s"}`
              : "Sem dados no período"
          }
          icon={Crown}
        />
        <HighlightCard
          label="Pacote mais vendido"
          value={bestPackage?.name ?? "—"}
          detail={
            bestPackage
              ? `${bestPackage.salesCount} venda${bestPackage.salesCount === 1 ? "" : "s"} · ${formatCurrency(bestPackage.revenue.toFixed(2))}`
              : "Sem dados no período"
          }
          icon={Package}
        />
        <HighlightCard
          label="Área mais vendida"
          value={bestArea?.name ?? "—"}
          detail={
            bestArea
              ? `${bestArea.sessionsCount} sessão${bestArea.sessionsCount === 1 ? "" : "ões"} em ${bestArea.salesCount} venda${bestArea.salesCount === 1 ? "" : "s"}`
              : "Sem dados no período"
          }
          icon={Layers}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4" aria-hidden="true" />
              Ranking de clientes
            </CardTitle>
            <CardDescription>
              Top 10 clientes por faturamento. Clique em um cliente para ver
              os detalhes da última compra.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {data.topClients.map((client, index) => (
                <RankedRow
                  key={client.id}
                  position={index + 1}
                  title={client.name}
                  subtitle={`${client.cityName ?? "Cidade não informada"} · ${client.purchases} compra${client.purchases === 1 ? "" : "s"}`}
                  value={formatCurrency(client.revenue.toFixed(2))}
                  onSelect={() => setSelectedClient(client)}
                />
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" aria-hidden="true" />
                Pacotes mais vendidos
              </CardTitle>
              <CardDescription>
                Ranking por quantidade de vendas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {data.topPackages.map((pkg, index) => (
                  <RankedRow
                    key={pkg.id}
                    position={index + 1}
                    title={pkg.name}
                    subtitle={`${pkg.salesCount} venda${pkg.salesCount === 1 ? "" : "s"}`}
                    value={formatCurrency(pkg.revenue.toFixed(2))}
                  />
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="size-4" aria-hidden="true" />
                Áreas mais vendidas
              </CardTitle>
              <CardDescription>
                Ranking por sessões vendidas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {data.topAreas.map((area, index) => (
                  <RankedRow
                    key={area.id}
                    position={index + 1}
                    title={area.name}
                    subtitle={`${area.salesCount} venda${area.salesCount === 1 ? "" : "s"}`}
                    value={`${area.sessionsCount} sessão${area.sessionsCount === 1 ? "" : "ões"}`}
                  />
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedClient && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setSelectedClient(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedClient.name}</DialogTitle>
              <DialogDescription>
                {selectedClient.cityName ?? "Cidade não informada"} ·{" "}
                {selectedClient.purchases} compra
                {selectedClient.purchases === 1 ? "" : "s"} ·{" "}
                {formatCurrency(selectedClient.revenue.toFixed(2))} no total
              </DialogDescription>
            </DialogHeader>

            <dl className="divide-y rounded-lg border">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="text-sm text-muted-foreground">
                  Data da última compra
                </dt>
                <dd className="text-sm font-medium">
                  {formatDate(selectedClient.lastPurchaseAt)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="text-sm text-muted-foreground">Valor</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {formatCurrency(selectedClient.lastPurchaseValue.toFixed(2))}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="shrink-0 text-sm text-muted-foreground">
                  Pacote contratado
                </dt>
                <dd className="text-right text-sm font-medium">
                  {selectedClient.lastPackageName ?? "Pacote não identificado"}
                </dd>
              </div>
            </dl>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" size="sm" variant="outline">
                  Fechar
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
