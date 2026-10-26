"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  Pencil,
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
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import { useApiQuery } from "@/hooks";
import { formatDate } from "@/lib/format/date";
import { salesService } from "@/services";
import type { Sale } from "@/types";

function formatCurrency(value: string | null): string {
  if (!value) {
    return "—";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

function shortId(value: string | null): string {
  if (!value) {
    return "—";
  }

  return value.slice(0, 8);
}

function SaleCard({
  sale,
  canWrite,
}: {
  sale: Sale;
  canWrite: boolean;
}) {
  const totalRemaining = sale.areas.reduce(
    (sum, area) => sum + area.remaining,
    0,
  );

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {sale.package?.name ?? "Pacote não identificado"}
            </CardTitle>
            <CardDescription>
              Vendido em {formatDate(sale.createdAt)} · {totalRemaining} sessões
              restantes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{formatCurrency(sale.value)}</Badge>
            {canWrite && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="h-8 gap-1.5"
              >
                <Link href={`/sales/${sale.id}/edit`}>
                  <Pencil className="size-3.5" />
                  Editar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sale.areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta venda não possui áreas com saldo.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {sale.areas.map((area) => (
              <li
                key={area.areaId}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <span className="text-sm font-medium">{area.areaName}</span>
                <span className="text-xs text-muted-foreground">
                  {area.remaining} de {area.sessionsCount} restantes
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            Desconto:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(sale.discount)}
            </span>
          </span>
          <span>
            Consultor: <span className="font-mono">{shortId(sale.consultantId)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesView({
  initialPatientId,
  canWrite,
}: {
  initialPatientId: string;
  canWrite: boolean;
}) {
  const [patientId, setPatientId] = useState(initialPatientId);

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => salesService.listByPatient(patientId, { signal }),
    `sales:${patientId}`,
    { enabled: Boolean(patientId) },
  );

  const sales = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data],
  );

  const createAction = canWrite ? (
    <Button asChild>
      <Link
        href={
          patientId
            ? `/sales/new?patientId=${encodeURIComponent(patientId)}`
            : "/sales/new"
        }
      >
        <Plus className="size-4" />
        Nova venda
      </Link>
    </Button>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas"
        description="Pacotes contratados por paciente e saldo de sessões por área."
        actions={createAction}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paciente</CardTitle>
          <CardDescription>
            Selecione a paciente para consultar os pacotes contratados.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl">
          <Field>
            <FieldLabel htmlFor="sale-patient-filter">Paciente</FieldLabel>
            <PatientCombobox
              id="sale-patient-filter"
              value={patientId}
              onChange={setPatientId}
            />
          </Field>
        </CardContent>
      </Card>

      {!patientId ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Selecione uma paciente</p>
            <p className="text-sm text-muted-foreground">
              As vendas são exibidas por paciente.
            </p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar as vendas</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <Button type="button" size="sm" onClick={refetch}>
              <RefreshCw className="size-4" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <BadgeDollarSign className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">Nenhuma venda registrada</p>
            <p className="text-sm text-muted-foreground">
              Registre o pacote contratado por esta paciente.
            </p>
          </div>
          {canWrite && (
            <Button asChild size="sm">
              <Link
                href={`/sales/new?patientId=${encodeURIComponent(patientId)}`}
              >
                <Plus className="size-4" />
                Nova venda
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} canWrite={canWrite} />
          ))}
        </div>
      )}
    </div>
  );
}
