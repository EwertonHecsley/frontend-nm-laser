"use client";

import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  CircleDollarSign,
  FilterX,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
import { formatCurrency, SaleCard } from "@/features/sales/components/sale-card";
import { SalesInsights } from "@/features/sales/components/sales-insights";
import { PAYMENT_METHOD_OPTIONS } from "@/features/sales/utils";
import { useApiQuery, usePagination } from "@/hooks";
import { toEndOfDayIso, toStartOfDayIso } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/http/errors";
import { citiesService, packagesService, salesService } from "@/services";
import type { PaymentMethod, Sale, SaleListFilters } from "@/types";
import { toast } from "sonner";

const ALL_CITIES = "all";
const ALL_CONSULTANTS = "all";
const ALL_PACKAGES = "all";
const ALL_PAYMENT_METHODS = "all";

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

export function SalesManagerDashboard({ canWrite }: { canWrite: boolean }) {
  const [period, setPeriod] = useState(initialPeriod);
  const [cityId, setCityId] = useState("");
  const [consultantId, setConsultantId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const from = toStartOfDayIso(period.from) ?? "";
  const to = toEndOfDayIso(period.to) ?? "";
  const enabled = Boolean(from && to && period.from <= period.to);
  const filters: SaleListFilters = {
    patientId: patientId || undefined,
    cityId: cityId || undefined,
    consultantId: consultantId || undefined,
    packageId: packageId || undefined,
    paymentMethod: paymentMethod || undefined,
    from: from || undefined,
    to: to || undefined,
  };
  const queryKey = `${period.from}:${period.to}:${cityId}:${consultantId}:${patientId}:${packageId}:${paymentMethod}`;

  const {
    data: cities,
    isLoading: isLoadingCities,
    refetch: refetchCities,
  } = useApiQuery((signal) => citiesService.list({ signal }), "manager-sales-cities");

  const {
    data: consultants,
    isLoading: isLoadingConsultants,
    refetch: refetchConsultants,
  } = useApiQuery(
    (signal) => salesService.consultants({ signal }),
    "manager-sales-consultants",
  );

  const {
    data: packages,
    isLoading: isLoadingPackages,
    refetch: refetchPackages,
  } = useApiQuery(
    (signal) => packagesService.list({ signal }),
    "manager-sales-packages",
  );

  const {
    data: sales,
    error: salesError,
    isLoading: isLoadingSales,
    refetch: refetchSales,
  } = useApiQuery(
    (signal) => salesService.list(filters, { signal }),
    `manager-sales-list:${queryKey}`,
    { enabled },
  );

  const {
    data: summary,
    error: summaryError,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useApiQuery(
    (signal) => salesService.summary(filters, { signal }),
    `manager-sales-summary:${queryKey}`,
    { enabled },
  );

  const cityOptions = useMemo(
    () =>
      [...(cities ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
    [cities],
  );
  const packageOptions = useMemo(
    () =>
      [...(packages ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      ),
    [packages],
  );

  const error = salesError ?? summaryError;
  const isLoading = isLoadingSales || isLoadingSummary;
  const hasFilters = Boolean(cityId || consultantId || patientId || packageId || paymentMethod);
  const averageTicket =
    summary && summary.salesCount > 0
      ? String(Number(summary.revenue) / summary.salesCount)
      : null;
  const {
    pageItems: salePageItems,
    page: salesPage,
    totalItems: salesTotalItems,
    setPage: setSalesPage,
  } = usePagination(sales ?? [], { resetKey: queryKey });

  async function handleDelete() {
    if (!saleToDelete) return;

    setIsDeleting(true);
    try {
      await salesService.remove(saleToDelete.id);
      toast.success("Compra excluída.");
      setSaleToDelete(null);
      refetchAll();
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  function refetchAll() {
    refetchCities();
    refetchConsultants();
    refetchPackages();
    refetchSales();
    refetchSummary();
  }

  function clearFilters() {
    setPeriod(initialPeriod());
    setCityId("");
    setConsultantId("");
    setPatientId("");
    setPackageId("");
    setPaymentMethod("");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros do dashboard</CardTitle>
          <CardDescription>
            Consulte quantidade de vendas e faturamento por cidade, consultora,
            cliente, pacote, forma de pagamento e período.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="sales-report-from">De</FieldLabel>
              <Input
                id="sales-report-from"
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
            </Field>
            <Field>
              <FieldLabel htmlFor="sales-report-to">Até</FieldLabel>
              <Input
                id="sales-report-to"
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
            </Field>
            <Field>
              <FieldLabel htmlFor="sales-report-city">Cidade</FieldLabel>
              <Select
                value={cityId || ALL_CITIES}
                onValueChange={(value) =>
                  setCityId(value === ALL_CITIES ? "" : value)
                }
                disabled={isLoadingCities}
              >
                <SelectTrigger id="sales-report-city" className="h-11 w-full">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CITIES}>Todas as cidades</SelectItem>
                  {cityOptions.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="sales-report-consultant">
                Consultora
              </FieldLabel>
              <Select
                value={consultantId || ALL_CONSULTANTS}
                onValueChange={(value) =>
                  setConsultantId(value === ALL_CONSULTANTS ? "" : value)
                }
                disabled={isLoadingConsultants}
              >
                <SelectTrigger
                  id="sales-report-consultant"
                  className="h-11 w-full"
                >
                  <SelectValue placeholder="Todas as consultoras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CONSULTANTS}>
                    Todas as consultoras
                  </SelectItem>
                  {(consultants ?? []).map((consultant) => (
                    <SelectItem key={consultant.id} value={consultant.id}>
                      {consultant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="sales-report-package">Pacote</FieldLabel>
              <Select
                value={packageId || ALL_PACKAGES}
                onValueChange={(value) =>
                  setPackageId(value === ALL_PACKAGES ? "" : value)
                }
                disabled={isLoadingPackages}
              >
                <SelectTrigger id="sales-report-package" className="h-11 w-full">
                  <SelectValue placeholder="Todos os pacotes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PACKAGES}>Todos os pacotes</SelectItem>
                  {packageOptions.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="sales-report-payment">
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
              >
                <SelectTrigger
                  id="sales-report-payment"
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
            <Field>
              <FieldLabel htmlFor="sales-report-patient">Cliente</FieldLabel>
              <PatientCombobox
                id="sales-report-patient"
                value={patientId}
                placeholder="Todos os clientes"
                onChange={setPatientId}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPeriod(getPresetRange("today"))}
            >
              Hoje
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPeriod(getPresetRange("last7Days"))}
            >
              Últimos 7 dias
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPeriod(getPresetRange("thisMonth"))}
            >
              Este mês
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPeriod(getPresetRange("lastMonth"))}
            >
              Mês passado
            </Button>
            {hasFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearFilters}
              >
                <FilterX className="size-4" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!enabled ? (
        <Alert>
          <CalendarDays className="size-4" />
          <AlertTitle>Informe um período válido</AlertTitle>
          <AlertDescription>
            Preencha as datas inicial e final para consultar as vendas.
          </AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar o dashboard de vendas</AlertTitle>
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Quantidade de vendas"
              value={String(summary.salesCount)}
              detail="Vendas registradas no período selecionado"
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
          </div>

          <SalesInsights
            sales={sales ?? []}
            description="Destaques gerais de clientes, pacotes e áreas com base nas vendas e filtros selecionados."
          />

          <section aria-labelledby="sales-report-list" className="space-y-3">
            <div className="space-y-1">
              <h2
                id="sales-report-list"
                className="text-lg font-semibold"
              >
                Vendas no período
              </h2>
              <p className="text-sm text-muted-foreground">
                {summary.salesCount} venda
                {summary.salesCount === 1 ? "" : "s"} encontrada
                {summary.salesCount === 1 ? "" : "s"} com os filtros atuais.
              </p>
            </div>

            {!sales || sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-14 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <BadgeDollarSign className="size-6" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">Nenhuma venda encontrada</p>
                  <p className="text-sm text-muted-foreground">
                    Ajuste os filtros de cidade, cliente, pacote, pagamento ou
                    período.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {salePageItems.map((sale) => (
                  <SaleCard
                    key={sale.id}
                    sale={sale}
                    canEdit={canWrite}
                    canDelete={canWrite}
                    onDelete={setSaleToDelete}
                  />
                ))}
                <Pagination
                  page={salesPage}
                  totalItems={salesTotalItems}
                  onPageChange={setSalesPage}
                />
              </div>
            )}
          </section>
        </>
      )}
      <ConfirmDeleteDialog
        open={Boolean(saleToDelete)}
        onOpenChange={(open) => {
          if (!open) setSaleToDelete(null);
        }}
        title="Excluir compra?"
        description={
          <>
            A compra de{" "}
            <strong className="font-medium text-foreground">
              {saleToDelete?.patient?.fullName ?? "cliente"}
            </strong>{" "}
            será removida permanentemente e deixará de compor o faturamento.
            Compras com tratamentos, sessões ou pagamentos vinculados não podem
            ser excluídas.
          </>
        }
        isDeleting={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
