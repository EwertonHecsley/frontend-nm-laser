"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import { SaleCard } from "@/features/sales/components/sale-card";
import { SalesManagerDashboard } from "@/features/sales/components/sales-manager-dashboard";
import { SalesVendorDashboard } from "@/features/sales/components/sales-vendor-dashboard";
import { useApiQuery, usePagination } from "@/hooks";
import { salesService } from "@/services";
import type { Role } from "@/types";

function PatientSalesSection({
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

  const { pageItems, page, totalItems, setPage } = usePagination(sales, {
    resetKey: patientId,
  });

  return (
    <>
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
          {pageItems.map((sale) => (
            <SaleCard key={sale.id} sale={sale} canEdit={canWrite} />
          ))}
          <Pagination
            page={page}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );
}

export function SalesView({
  initialPatientId,
  canWrite,
  role,
}: {
  initialPatientId: string;
  canWrite: boolean;
  role: Role;
}) {
  const isManager = role === "gestora";
  const isVendor = role === "vendas";

  const createAction = canWrite ? (
    <Button asChild>
      <Link
        href={
          !isManager && initialPatientId
            ? `/sales/new?patientId=${encodeURIComponent(initialPatientId)}`
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
        description={
          isManager
            ? "Acompanhe quantidade de vendas e faturamento por cidade, consultora, cliente e período."
            : isVendor
              ? "Acompanhe o resumo das suas vendas, seus clientes e as melhores oportunidades de contato."
              : "Pacotes contratados por paciente e saldo de sessões por área."
        }
        actions={createAction}
      />

      {isManager ? (
        <SalesManagerDashboard canWrite={canWrite} />
      ) : isVendor ? (
        <SalesVendorDashboard canWrite={canWrite} />
      ) : (
        <PatientSalesSection
          initialPatientId={initialPatientId}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}
