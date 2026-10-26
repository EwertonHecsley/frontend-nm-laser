"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
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
import {
  packageFormSchema,
  type PackageFormValues,
} from "@/features/packages/schemas";
import { useApiQuery } from "@/hooks";
import {
  formatCurrency,
  parseMoneyInput,
} from "@/lib/format/currency";
import { getErrorMessage } from "@/lib/http/errors";
import { sanitizeSingleLine } from "@/lib/security/sanitize";
import { areasService, packagesService } from "@/services";

const createDefaultItem = () => ({
  areaId: "",
  sessionsCount: 10,
  price: "",
});

interface PackageFormProps {
  mode: "create" | "edit";
  packageId?: string;
}

export function PackageForm({ mode, packageId = "" }: PackageFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const {
    data: areas,
    isLoading: isLoadingAreas,
    error: areasError,
  } = useApiQuery((signal) => areasService.list({ signal }), "package-areas");

  const {
    data: pkg,
    error: loadError,
    isLoading: isLoadingPackage,
    refetch,
  } = useApiQuery(
    (signal) => packagesService.getById(packageId, { signal }),
    `package:${packageId}`,
    { enabled: isEdit },
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      name: "",
      maxDiscountPercent: 0,
      items: [createDefaultItem()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const totalPrice = watchedItems.reduce(
    (total, item) => total + parseMoneyInput(item?.price ?? ""),
    0,
  );
  const totalSessions = watchedItems.reduce(
    (total, item) => total + (Number(item?.sessionsCount) || 0),
    0,
  );

  useEffect(() => {
    if (pkg) {
      reset({
        name: pkg.name,
        maxDiscountPercent: pkg.maxDiscountPercent,
        items:
          pkg.items.length > 0
            ? pkg.items.map((item) => ({
                areaId: item.areaId,
                sessionsCount: item.sessionsCount,
                price: item.price,
              }))
            : [createDefaultItem()],
      });
    }
  }, [pkg, reset]);

  async function onSubmit(values: PackageFormValues) {
    const name = sanitizeSingleLine(values.name, 120);

    if (!name) {
      setError("name", { message: "Informe o nome do pacote." });
      return;
    }

    const items = values.items.map((item) => ({
      areaId: item.areaId,
      sessionsCount: Number(item.sessionsCount),
      price: item.price,
    }));
    const maxDiscountPercent = Number(values.maxDiscountPercent);

    try {
      if (isEdit) {
        await packagesService.update(packageId, {
          name,
          maxDiscountPercent,
          items,
        });
        toast.success("Pacote atualizado.");
      } else {
        await packagesService.create({
          name,
          maxDiscountPercent,
          items,
        });
        toast.success("Pacote cadastrado.");
      }

      router.push("/packages");
      router.refresh();
    } catch (error) {
      const message = getErrorMessage(error);
      setError("root", { message });
      toast.error(message);
    }
  }

  if (isEdit && isLoadingPackage) {
    return (
      <Card className="max-w-3xl">
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
      <Alert variant="destructive" className="max-w-3xl">
        <AlertTriangle className="size-4" />
        <AlertTitle>Não foi possível carregar o pacote</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{loadError}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={refetch}>
              Tentar novamente
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/packages">Voltar</Link>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>
          {isEdit ? "Dados do pacote" : "Cadastrar pacote"}
        </CardTitle>
        <CardDescription>
          Defina o nome, o preço de cada área, o total do pacote e o desconto
          máximo que a consultora pode conceder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="package-name">Nome do pacote</FieldLabel>
            <Input
              id="package-name"
              autoFocus
              maxLength={120}
              placeholder="Ex.: Pacote axila e buço"
              className="h-11"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={Boolean(errors.maxDiscountPercent)}>
            <FieldLabel htmlFor="package-max-discount">
              Desconto máximo permitido (%)
            </FieldLabel>
            <Input
              id="package-max-discount"
              type="number"
              min={0}
              max={100}
              step={0.01}
              inputMode="decimal"
              className="h-11"
              aria-invalid={Boolean(errors.maxDiscountPercent)}
              {...register("maxDiscountPercent", { valueAsNumber: true })}
            />
            <FieldDescription>
              A consultora só poderá aplicar descontos até este percentual do
              valor do pacote.
            </FieldDescription>
            <FieldError errors={[errors.maxDiscountPercent]} />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Áreas do pacote</p>
                <p className="text-xs text-muted-foreground">
                  Cada área tem seu próprio saldo de sessões e preço.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(createDefaultItem())}
                disabled={isLoadingAreas || (areas ?? []).length === 0}
              >
                <Plus className="size-4" />
                Adicionar área
              </Button>
            </div>

            {areasError ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Não foi possível carregar as áreas</AlertTitle>
                <AlertDescription>{areasError}</AlertDescription>
              </Alert>
            ) : !isLoadingAreas && (areas ?? []).length === 0 ? (
              <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                Nenhuma área cadastrada.{" "}
                <Link href="/areas/new" className="underline underline-offset-4">
                  Cadastre uma área
                </Link>{" "}
                antes de montar o pacote.
              </div>
            ) : (
              <FieldGroup className="gap-3">
                {fields.map((field, index) => {
                  const itemErrors = errors.items?.[index];

                  return (
                    <div
                      key={field.id}
                      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_110px_150px_auto] sm:items-start"
                    >
                      <Field data-invalid={Boolean(itemErrors?.areaId)}>
                        <FieldLabel htmlFor={`package-area-${index}`}>
                          Área
                        </FieldLabel>
                        <Controller
                          control={control}
                          name={`items.${index}.areaId`}
                          render={({ field: selectField }) => (
                            <Select
                              value={selectField.value}
                              onValueChange={selectField.onChange}
                              disabled={isLoadingAreas}
                            >
                              <SelectTrigger
                                id={`package-area-${index}`}
                                className="h-10 w-full"
                                aria-invalid={Boolean(itemErrors?.areaId)}
                              >
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {(areas ?? []).map((area) => (
                                  <SelectItem key={area.id} value={area.id}>
                                    {area.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError errors={[itemErrors?.areaId]} />
                      </Field>

                      <Field data-invalid={Boolean(itemErrors?.sessionsCount)}>
                        <FieldLabel htmlFor={`package-count-${index}`}>
                          Sessões
                        </FieldLabel>
                        <Input
                          id={`package-count-${index}`}
                          type="number"
                          min={1}
                          max={999}
                          className="h-10"
                          aria-invalid={Boolean(itemErrors?.sessionsCount)}
                          {...register(`items.${index}.sessionsCount`, {
                            valueAsNumber: true,
                          })}
                        />
                        <FieldError errors={[itemErrors?.sessionsCount]} />
                      </Field>

                      <Field data-invalid={Boolean(itemErrors?.price)}>
                        <FieldLabel htmlFor={`package-price-${index}`}>
                          Preço (R$)
                        </FieldLabel>
                        <Input
                          id={`package-price-${index}`}
                          inputMode="decimal"
                          maxLength={40}
                          placeholder="0,00"
                          className="h-10"
                          aria-invalid={Boolean(itemErrors?.price)}
                          {...register(`items.${index}.price`)}
                        />
                        <FieldError errors={[itemErrors?.price]} />
                      </Field>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                          aria-label="Remover área do pacote"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {errors.items?.message && (
                  <p className="text-sm text-destructive">
                    {errors.items.message}
                  </p>
                )}
              </FieldGroup>
            )}

            <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-muted-foreground">
                Sessões totais:{" "}
                <span className="font-medium text-foreground">
                  {totalSessions}
                </span>
              </span>
              <span className="text-muted-foreground">
                Valor do pacote:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(totalPrice)}
                </span>
              </span>
            </div>
            <FieldDescription>
              O valor do pacote é calculado somando os preços de cada área.
            </FieldDescription>
          </div>

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
              <Link href="/packages">
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
              {isSubmitting ? "Salvando…" : "Salvar pacote"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
