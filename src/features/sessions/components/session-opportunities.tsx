"use client";

import {
  AlertTriangle,
  Boxes,
  CalendarPlus,
  ClipboardList,
  Clock,
  MessageCircle,
  RefreshCw,
  Users,
  type LucideIcon,
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
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery, usePagination } from "@/hooks";
import { formatDate } from "@/lib/format/date";
import { buildWhatsAppHref } from "@/lib/whatsapp";
import { salesService } from "@/services";
import type {
  SaleOpportunitiesStats,
  SaleOpportunity,
} from "@/types";

type OpportunityFilter = "all" | "notStarted" | "inProgress";

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone?: "default" | "waiting" | "progress" | "pending";
}) {
  const tones: Record<typeof tone, string> = {
    default: "bg-accent text-accent-foreground",
    waiting: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    progress: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    pending: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        </div>
        <span
          className={`grid size-10 place-items-center rounded-xl shadow-sm ${tones[tone]}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {detail}
      </CardContent>
    </Card>
  );
}

function getOpportunityMessage(item: SaleOpportunity): string {
  const packageName = item.package?.name ?? "seu pacote";
  const greeting = `Olá, ${item.patient.fullName}! Tudo bem?`;

  if (!item.started) {
    return `${greeting} Vi que você adquiriu o pacote ${packageName} e ainda não iniciamos suas sessões. Podemos agendar sua primeira sessão?`;
  }

  const remainingLabel =
    item.remaining === 1 ? "1 sessão" : `${item.remaining} sessões`;

  return `${greeting} Seu pacote ${packageName} ainda tem ${remainingLabel} a realizar. Podemos agendar sua próxima sessão?`;
}

function OpportunityCard({
  item,
  canSchedule,
  canWrite,
}: {
  item: SaleOpportunity;
  canSchedule: boolean;
  canWrite: boolean;
}) {
  const whatsappHref = buildWhatsAppHref(
    item.patient.whatsapp,
    getOpportunityMessage(item),
  );
  const scheduleHref = `/appointments/new?patientId=${encodeURIComponent(
    item.patient.id,
  )}`;
  const registerSessionHref = `/sessions/new?patientId=${encodeURIComponent(
    item.patient.id,
  )}&saleId=${encodeURIComponent(item.saleId)}`;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {item.patient.fullName}
            </CardTitle>
            <CardDescription>
              {item.city?.name ?? "Cidade não informada"} · Compra em{" "}
              {formatDate(item.purchasedAt)}
            </CardDescription>
          </div>
          <Badge variant={item.started ? "secondary" : "outline"}>
            {item.started ? "Em aberto" : "Aguardando 1ª sessão"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="space-y-0.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Pacote contratado
            </p>
            <p className="text-sm font-medium">
              {item.package?.name ?? "Pacote não identificado"}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{item.used}</span>{" "}
              {item.used === 1 ? "sessão realizada" : "sessões realizadas"}
            </p>
            <p>
              <span className="font-medium text-foreground">
                {item.remaining}
              </span>{" "}
              de {item.sessionsCount} restantes
            </p>
          </div>
        </div>

        {item.areas.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Saldo por área
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.areas.map((area) => (
                <Badge key={area.areaId} variant="secondary">
                  {area.areaName} · {area.remaining}/{area.sessionsCount}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {canWrite && (
            <Button asChild size="sm" className="gap-1.5">
              <Link href={registerSessionHref}>
                <ClipboardList className="size-4" />
                Registrar sessão
              </Link>
            </Button>
          )}

          {whatsappHref ? (
            <Button asChild size="sm" className="gap-1.5">
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

          {canSchedule && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href={scheduleHref}>
                <CalendarPlus className="size-4" />
                Agendar sessão
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunitiesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SessionOpportunities({
  refreshKey = 0,
  canSchedule = false,
  canWrite = false,
}: {
  refreshKey?: number;
  canSchedule?: boolean;
  canWrite?: boolean;
}) {
  const [filter, setFilter] = useState<OpportunityFilter>("all");

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => salesService.opportunities({ signal }),
    `session-opportunities:${refreshKey}`,
  );

  const stats: SaleOpportunitiesStats | undefined = data?.stats;
  const packages = useMemo(() => data?.packages ?? [], [data]);

  const filteredPackages = useMemo(() => {
    if (filter === "notStarted") {
      return packages.filter((item) => !item.started);
    }

    if (filter === "inProgress") {
      return packages.filter((item) => item.started);
    }

    return packages;
  }, [filter, packages]);

  const { pageItems, page, totalItems, setPage } = usePagination(
    filteredPackages,
    { resetKey: filter },
  );

  return (
    <section aria-labelledby="session-opportunities" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 id="session-opportunities" className="text-lg font-semibold">
            Vendas com sessões contratadas
          </h2>
          <p className="text-sm text-muted-foreground">
            Pacotes vendidos pelas consultoras que ainda possuem sessões a
            realizar. Registre a sessão diretamente pela venda correspondente.
          </p>
        </div>
        {stats && (
          <Badge variant="secondary">
            {stats.activePackagesCount}{" "}
            {stats.activePackagesCount === 1
              ? "pacote ativo"
              : "pacotes ativos"}
          </Badge>
        )}
      </div>

      {isLoading && !data ? (
        <OpportunitiesSkeleton />
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            Não foi possível carregar os clientes com sessões pendentes
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button type="button" size="sm" onClick={refetch}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Clientes com pacote"
              value={stats.patientsCount}
              detail={`${stats.activePatientsCount} com sessões pendentes`}
              icon={Users}
            />
            <SummaryCard
              label="Aguardando 1ª sessão"
              value={stats.notStartedPatientsCount}
              detail={`${stats.notStartedCount} ${
                stats.notStartedCount === 1 ? "pacote" : "pacotes"
              } não iniciado${stats.notStartedCount === 1 ? "" : "s"}`}
              icon={Clock}
              tone="waiting"
            />
            <SummaryCard
              label="Em aberto"
              value={stats.inProgressPatientsCount}
              detail={`${stats.inProgressCount} ${
                stats.inProgressCount === 1 ? "pacote" : "pacotes"
              } com sessões a concluir`}
              icon={Boxes}
              tone="progress"
            />
            <SummaryCard
              label="Sessões a realizar"
              value={stats.pendingSessions}
              detail="Saldo total dos pacotes ativos"
              icon={CalendarPlus}
              tone="pending"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => setFilter("all")}
            >
              Todos ({stats.activePackagesCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === "notStarted" ? "default" : "outline"}
              onClick={() => setFilter("notStarted")}
            >
              Aguardando 1ª sessão ({stats.notStartedCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter === "inProgress" ? "default" : "outline"}
              onClick={() => setFilter("inProgress")}
            >
              Em aberto ({stats.inProgressCount})
            </Button>
          </div>

          {filteredPackages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">
                  {packages.length === 0
                    ? "Nenhum pacote com sessões pendentes"
                    : "Nenhum cliente neste filtro"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {packages.length === 0
                    ? "Quando houver pacotes vendidos com saldo, os clientes aparecerão aqui."
                    : "Selecione outro filtro para visualizar os demais clientes."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pageItems.map((item) => (
                <OpportunityCard
                  key={item.saleId}
                  item={item}
                  canSchedule={canSchedule}
                  canWrite={canWrite}
                />
              ))}
              <Pagination
                page={page}
                totalItems={totalItems}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
