"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  Loader2,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import {
  formatCurrency,
  SaleCard,
} from "@/features/sales/components/sale-card";
import { SalesManagerDashboard } from "@/features/sales/components/sales-manager-dashboard";
import { SalesVendorDashboard } from "@/features/sales/components/sales-vendor-dashboard";
import { PAYMENT_METHOD_OPTIONS } from "@/features/sales/utils";
import { useApiQuery, usePagination } from "@/hooks";
import { getErrorMessage } from "@/lib/http/errors";
import { packagesService, salesService } from "@/services";
import type { PaymentMethod, SaleListFilters, Role } from "@/types";

const ALL_PACKAGES = "all";
const ALL_PAYMENT_METHODS = "all";

function PatientSalesSection({
  initialPatientId,
  canWrite,
}: {
  initialPatientId: string;
  canWrite: boolean;
}) {
  const [patientId, setPatientId] = useState(initialPatientId);
  const [packageId, setPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");

  const filters: SaleListFilters = {
    patientId: patientId || undefined,
    packageId: packageId || undefined,
    paymentMethod: paymentMethod || undefined,
  };

  const { data, error, isLoading, refetch } = useApiQuery(
    (signal) => salesService.list(filters, { signal }),
    `sales:${patientId}:${packageId}:${paymentMethod}`,
    { enabled: Boolean(patientId) },
  );

  const { data: packages, isLoading: isLoadingPackages } = useApiQuery(
    (signal) => packagesService.list({ signal }),
    "patient-sales-packages",
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
    resetKey: `${patientId}:${packageId}:${paymentMethod}`,
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paciente</CardTitle>
          <CardDescription>
            Selecione a paciente e refine por pacote ou forma de pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="sale-patient-filter">Paciente</FieldLabel>
              <PatientCombobox
                id="sale-patient-filter"
                value={patientId}
                onChange={setPatientId}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="sale-package-filter">Pacote</FieldLabel>
              <Select
                value={packageId || ALL_PACKAGES}
                onValueChange={(value) =>
                  setPackageId(value === ALL_PACKAGES ? "" : value)
                }
                disabled={!patientId || isLoadingPackages}
              >
                <SelectTrigger id="sale-package-filter" className="h-11 w-full">
                  <SelectValue placeholder="Todos os pacotes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PACKAGES}>Todos os pacotes</SelectItem>
                  {(packages ?? []).map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="sale-payment-filter">
                Forma de pagamento
              </FieldLabel>
              <Select
                value={paymentMethod || ALL_PAYMENT_METHODS}
                onValueChange={(value) =>
                  setPaymentMethod(
                    value === ALL_PAYMENT_METHODS
                      ? ""
                      : (value as PaymentMethod),
                  )
                }
                disabled={!patientId}
              >
                <SelectTrigger
                  id="sale-payment-filter"
                  className="h-11 w-full"
                >
                  <SelectValue placeholder="Todas as formas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PAYMENT_METHODS}>
                    Todas as formas
                  </SelectItem>
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
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


function PendingPaymentsSection({
  consultantId,
  canWrite,
}: {
  consultantId?: string;
  canWrite: boolean;
}) {
  const { data, isLoading, error, refetch } = useApiQuery(
    (signal) =>
      salesService.list(
        { consultantId, paymentMethod: undefined },
        { signal },
      ),
    `pending-payments:${consultantId ?? "all"}`,
  );

  const pending = (data ?? []).filter(
    (sale) => sale.paymentStatus === "open",
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function confirm(id: string) {
    setConfirmingId(id);

    try {
      await salesService.update(id, { paymentStatus: "confirmed" });
      toast.success("Pagamento confirmado.");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pagamentos pendentes</CardTitle>
        <CardDescription>
          Vendas registradas como abertas aguardando confirmação do pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Não foi possível carregar os pagamentos pendentes</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{error}</p>
              <Button type="button" size="sm" onClick={refetch}>
                <RefreshCw className="size-4" />
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma venda pendente de pagamento.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((sale) => (
              <div
                key={sale.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {sale.patient?.fullName ?? "Paciente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sale.package?.name ?? "Pacote"} ·{" "}
                    {formatCurrency(
                      String(
                        Math.max(
                          0,
                          Number(sale.value) - Number(sale.discount ?? 0),
                        ),
                      ),
                    )}
                  </p>
                </div>
                {canWrite && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={confirmingId === sale.id}
                    onClick={() => void confirm(sale.id)}
                  >
                    {confirmingId === sale.id ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Confirmando…
                      </>
                    ) : (
                      "Confirmar pagamento"
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SalesView({
  initialPatientId,
  canWrite,
  role,
  userId,
}: {
  initialPatientId: string;
  canWrite: boolean;
  role: Role;
  userId: string;
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

      {(isManager || isVendor) && (
        <PendingPaymentsSection
          consultantId={isVendor ? userId : undefined}
          canWrite={canWrite}
        />
      )}

      {isManager ? (
        <SalesManagerDashboard canWrite={canWrite} />
      ) : isVendor ? (
        <SalesVendorDashboard canWrite={canWrite} consultantId={userId} />
      ) : (
        <PatientSalesSection
          initialPatientId={initialPatientId}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}
