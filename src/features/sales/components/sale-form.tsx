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
import { useApiQuery } from "@/hooks";
import { getErrorMessage } from "@/lib/http/errors";
import { packagesService, salesService } from "@/services";

interface SaleFormProps {
  mode: "create" | "edit";
  saleId?: string;
  initialPatientId?: string;
}

export function SaleForm({
  mode,
  saleId = "",
  initialPatientId = "",
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
    formState: { errors, isSubmitting },
  } = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      patientId: initialPatientId,
      packageId: "",
      consultantId: "",
      value: "",
      discount: "",
    },
  });

  const selectedPackageId = useWatch({ control, name: "packageId" });
  const selectedPackage = useMemo(
    () => (packages ?? []).find((pkg) => pkg.id === selectedPackageId),
    [packages, selectedPackageId],
  );

  useEffect(() => {
    if (sale) {
      reset({
        patientId: sale.patientId,
        packageId: sale.packageId ?? "",
        consultantId: sale.consultantId ?? "",
        value: sale.value,
        discount: sale.discount ?? "",
      });
    }
  }, [sale, reset]);

  async function onSubmit(values: SaleFormValues) {
    const value = values.value.replace(",", ".");
    const discount = values.discount
      ? values.discount.replace(",", ".")
      : undefined;
    const consultantId = values.consultantId.trim();

    try {
      if (isEdit) {
        await salesService.update(saleId, {
          consultantId: consultantId || null,
          value,
          discount: discount ?? null,
        });
        toast.success("Venda atualizada.");
        router.push(
          `/sales?patientId=${encodeURIComponent(values.patientId)}`,
        );
      } else {
        await salesService.create({
          patientId: values.patientId,
          packageId: values.packageId,
          consultantId: consultantId || undefined,
          value,
          discount,
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
            ? "Atualize o valor, o desconto ou o consultor responsável."
            : "Vincule um pacote à paciente para liberar o saldo das sessões."}
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
                          {pkg.name} · {pkg.sessionsCount} sessões
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
                                `${item.areaName} (${item.sessionsCount})`,
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
                placeholder="Ex.: 1200,00"
                className="h-11"
                aria-invalid={Boolean(errors.value)}
                {...register("value")}
              />
              <FieldError errors={[errors.value]} />
            </Field>

            <Field data-invalid={Boolean(errors.discount)}>
              <FieldLabel htmlFor="sale-discount">Desconto (opcional)</FieldLabel>
              <Input
                id="sale-discount"
                inputMode="decimal"
                maxLength={40}
                placeholder="Ex.: 100,00"
                className="h-11"
                aria-invalid={Boolean(errors.discount)}
                {...register("discount")}
              />
              <FieldError errors={[errors.discount]} />
            </Field>

            <Field
              className="sm:col-span-2"
              data-invalid={Boolean(errors.consultantId)}
            >
              <FieldLabel htmlFor="sale-consultant">
                Consultor (opcional)
              </FieldLabel>
              <Input
                id="sale-consultant"
                placeholder="UUID do consultor"
                autoComplete="off"
                className="h-11"
                aria-invalid={Boolean(errors.consultantId)}
                {...register("consultantId")}
              />
              {errors.consultantId ? (
                <FieldError errors={[errors.consultantId]} />
              ) : (
                <FieldDescription>
                  O backend não expõe listagem de usuários; informe o UUID do
                  consultor ou deixe em branco.
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
