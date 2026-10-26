"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientCombobox } from "@/features/appointments/components/patient-combobox";
import { saleFormSchema, type SaleFormValues } from "@/features/sales/schemas";
import { PAYMENT_METHOD_OPTIONS } from "@/features/sales/utils";
import { useApiQuery } from "@/hooks";
import {
  formatCurrency,
  parseMoneyInput,
} from "@/lib/format/currency";
import { getErrorMessage } from "@/lib/http/errors";
import { packagesService, salesService } from "@/services";
import type { PaymentMethod, Role } from "@/types";

interface SaleFormProps {
  mode: "create" | "edit";
  saleId?: string;
  initialPatientId?: string;
  role: Role;
}

export function SaleForm({
  mode,
  saleId = "",
  initialPatientId = "",
  role,
}: SaleFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    data: packages,
    isLoading: isLoadingPackages,
    error: packagesError,
  } = useApiQuery(
    (signal) => packagesService.list({ signal }),
    "sale-packages",
  );

  const {
    data: sale,
    error: loadError,
    isLoading: isLoadingSale,
    refetch,
  } = useApiQuery(
    (signal) => salesService.getById(saleId, { signal }),
    `sale:${saleId}`,
    { enabled: isEdit },
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      patientId: initialPatientId,
      packageId: "",
      value: "",
      discount: "",
      paymentMethod: "",
    },
  });

  const selectedPackageId = useWatch({ control, name: "packageId" });
  const watchedValue = useWatch({ control, name: "value" });
  const watchedDiscount = useWatch({ control, name: "discount" });
  const selectedPackage = useMemo(
    () => (packages ?? []).find((pkg) => pkg.id === selectedPackageId),
    [packages, selectedPackageId],
  );
  const maxDiscountPercent =
    selectedPackage?.maxDiscountPercent ??
    sale?.package?.maxDiscountPercent ??
    0;
  const valueAmount = parseMoneyInput(watchedValue ?? "");
  const maxDiscountAmount = (valueAmount * maxDiscountPercent) / 100;
  const discountAmount = parseMoneyInput(watchedDiscount ?? "");
  const discountPercent =
    valueAmount > 0 ? (discountAmount / valueAmount) * 100 : 0;
  const isManager = role === "gestora";
  const valueIsReadOnly = !isEdit || !isManager;
  const enforceDiscountLimit = role === "vendas";

  useEffect(() => {
    if (!isEdit && selectedPackage) {
      setValue("value", selectedPackage.price, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [isEdit, selectedPackage, setValue]);

  useEffect(() => {
    if (sale) {
      reset({
        patientId: sale.patientId,
        packageId: sale.packageId ?? "",
        value: sale.value,
        discount: sale.discount ?? "",
        paymentMethod: sale.paymentMethod,
      });
    }
  }, [sale, reset]);

  async function onSubmit(values: SaleFormValues) {
    const value = valueIsReadOnly
      ? (isEdit ? (sale?.value ?? values.value) : (selectedPackage?.price ?? values.value))
      : values.value;
    const normalizedValue = value.replace(",", ".");
    const discount = values.discount
      ? values.discount.replace(",", ".")
      : undefined;

    if (enforceDiscountLimit) {
      const allowed = maxDiscountAmount;

      if (parseMoneyInput(discount ?? "") > allowed + 0.001) {
        setError("discount", {
          message: `O desconto máximo permitido é ${formatCurrency(allowed)} (${maxDiscountPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%).`,
        });
        return;
      }
    }

    try {
      if (isEdit) {
        await salesService.update(saleId, {
          value: normalizedValue,
          discount: discount ?? null,
          paymentMethod: values.paymentMethod as PaymentMethod,
        });
        toast.success("Venda atualizada.");
        router.push(
          `/sales?patientId=${encodeURIComponent(values.patientId)}`,
        );
      } else {
        await salesService.create({
          patientId: values.patientId,
          packageId: values.packageId,
          value: normalizedValue,
          discount,
          paymentMethod: values.paymentMethod as PaymentMethod,
        });
        toast.success("Venda registrada.");
        router.push(
          `/sales?patientId=${encodeURIComponent(values.patientId)}`,
        );
      }

      router.refresh();
    } catch (error) {
      const message = getErrorMessage(error);
      setError("root", { message });
      toast.error(message);
    }
  }

  if (isEdit && isLoadingSale) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (isEdit && loadError) {
    return (
      <Alert variant="destructive" className="max-w-2xl">
        <AlertTriangle className="size-4" />
        <AlertTitle>Não foi possível carregar a venda</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{loadError}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={refetch}>
              Tentar novamente
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/sales">Voltar</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEdit ? "Dados da venda" : "Registrar venda"}</CardTitle>
        <CardDescription>
          {isEdit
            ? isManager
              ? "Atualize o valor, o desconto ou a forma de pagamento da venda."
              : "Atualize o desconto da venda dentro do limite permitido pela gestora."
            : "O valor é definido automaticamente pelo preço do pacote. Informe a forma de pagamento e, se necessário, um desconto dentro do limite permitido."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <FieldGroup className="grid gap-5 sm:grid-cols-2">
            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.patientId)}
            >
              <FieldLabel htmlFor="sale-patient">Paciente</FieldLabel>
              <Controller
                control={control}
                name="patientId"
                render={({ field }) => (
                  <PatientCombobox
                    id="sale-patient"
                    value={field.value}
                    invalid={Boolean(errors.patientId)}
                    disabled={isEdit}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError errors={[errors.patientId]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.packageId)}
            >
              <FieldLabel htmlFor="sale-package">Pacote</FieldLabel>
              <Controller
                control={control}
                name="packageId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit || isLoadingPackages}
                  >
                    <SelectTrigger
                      id="sale-package"
                      className="h-11 w-full"
                      aria-invalid={Boolean(errors.packageId)}
                    >
                      <SelectValue
                        placeholder={
                          isLoadingPackages
                            ? "Carregando pacotes…"
                            : "Selecione o pacote"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(packages ?? []).map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} · {pkg.sessionsCount} sessões ·{" "}
                          {formatCurrency(pkg.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.packageId ? (
                <FieldError errors={[errors.packageId]} />
              ) : (
                <FieldDescription>
                  {packagesError
                    ? packagesError
                    : !isLoadingPackages && (packages ?? []).length === 0
                      ? "Nenhum pacote cadastrado. Cadastre um pacote antes de registrar a venda."
                      : selectedPackage
                        ? selectedPackage.items
                            .map(
                              (item) =>
                                `${item.areaName} (${item.sessionsCount}) · ${formatCurrency(item.price)}`,
                            )
                            .join(" · ")
                        : "Selecione o pacote contratado pela paciente."}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.value)}>
              <FieldLabel htmlFor="sale-value">Valor</FieldLabel>
              <Input
                id="sale-value"
                inputMode="decimal"
                maxLength={40}
                placeholder="Definido pelo pacote"
                className="h-11"
                readOnly={valueIsReadOnly}
                aria-invalid={Boolean(errors.value)}
                {...register("value")}
              />
              {errors.value ? (
                <FieldError errors={[errors.value]} />
              ) : (
                <FieldDescription>
                  {valueIsReadOnly
                    ? isEdit
                      ? "Valor definido pelo cadastro do pacote. A consultora não pode alterá-lo."
                      : "Valor definido automaticamente pelo cadastro do pacote."
                    : "Como gestora, você pode ajustar o valor desta venda."}
                </FieldDescription>
              )}
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.paymentMethod)}
            >
              <FieldLabel htmlFor="sale-payment-method">
                Forma de pagamento
              </FieldLabel>
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="sale-payment-method"
                      className="h-11 w-full"
                      aria-invalid={Boolean(errors.paymentMethod)}
                    >
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.paymentMethod]} />
            </Field>

            <Field data-invalid={Boolean(errors.discount)}>
              <FieldLabel htmlFor="sale-discount">
                Desconto (opcional)
              </FieldLabel>
              <Input
                id="sale-discount"
                inputMode="decimal"
                maxLength={40}
                placeholder="Ex.: 100,00"
                className="h-11"
                aria-invalid={Boolean(errors.discount)}
                {...register("discount")}
              />
              {errors.discount ? (
                <FieldError errors={[errors.discount]} />
              ) : (
                <FieldDescription>
                  {selectedPackage
                    ? `Máximo permitido: ${formatCurrency(maxDiscountAmount)} (${maxDiscountPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%)${discountPercent > 0 ? ` · Aplicado: ${discountPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%` : ""}.`
                    : "Selecione o pacote para ver o desconto máximo permitido."}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>

          {errors.root?.message && (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {errors.root.message}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href="/sales">
                <ArrowLeft className="size-4" />
                Cancelar
              </Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSubmitting ? "Salvando…" : "Salvar venda"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
