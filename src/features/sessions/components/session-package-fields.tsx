"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "cn";
import type { Sale } from "@/types";

export const NO_SALE = "none";

interface SessionPackageFieldsProps {
  idPrefix: string;
  saleId: string;
  areaIds: string[];
  sales: readonly Sale[];
  patientSelected: boolean;
  isLoadingSales: boolean;
  salesError?: string | null;
  saleError?: string;
  areasError?: string;
  canCreateSale?: boolean;
  newSaleHref?: string;
  onRetrySales?: () => void;
  onSaleChange: (saleId: string) => void;
  onAreasChange: (areaIds: string[]) => void;
}

export function SessionPackageFields({
  idPrefix,
  saleId,
  areaIds,
  sales,
  patientSelected,
  isLoadingSales,
  salesError,
  saleError,
  areasError,
  canCreateSale = false,
  newSaleHref,
  onRetrySales,
  onSaleChange,
  onAreasChange,
}: SessionPackageFieldsProps) {
  const selectedSale = useMemo(
    () => sales.find((sale) => sale.id === saleId),
    [sales, saleId],
  );
  const availableAreas = selectedSale?.areas ?? [];
  const hasSales = sales.length > 0;

  const placeholder = isLoadingSales
    ? "Carregando pacotes…"
    : !patientSelected
      ? "Selecione a paciente"
      : hasSales
        ? "Selecione o pacote"
        : "Nenhum pacote disponível";

  function toggleArea(areaId: string) {
    onAreasChange(
      areaIds.includes(areaId)
        ? areaIds.filter((id) => id !== areaId)
        : [...areaIds, areaId],
    );
  }

  return (
    <>
      <Field className="sm:col-span-2" data-invalid={Boolean(saleError)}>
        <FieldLabel htmlFor={`${idPrefix}-saleId`}>
          Pacote contratado
        </FieldLabel>
        <Select
          value={patientSelected ? saleId || NO_SALE : ""}
          onValueChange={(value) =>
            onSaleChange(value === NO_SALE ? "" : value)
          }
          disabled={!patientSelected || isLoadingSales}
        >
          <SelectTrigger
            id={`${idPrefix}-saleId`}
            className="h-11 w-full"
            aria-invalid={Boolean(saleError)}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SALE}>Sem pacote vinculado</SelectItem>
            {sales.map((sale) => (
              <SelectItem key={sale.id} value={sale.id}>
                {sale.package?.name ?? "Pacote sem nome"}
                {sale.areas.length > 0
                  ? ` · ${sale.areas.reduce(
                      (sum, area) => sum + area.remaining,
                      0,
                    )} sessões restantes`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saleError ? (
          <p className="text-sm text-destructive">{saleError}</p>
        ) : salesError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{salesError}</p>
            {onRetrySales && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetrySales}
              >
                <RefreshCw className="size-3.5" />
                Tentar novamente
              </Button>
            )}
          </div>
        ) : !patientSelected ? (
          <FieldDescription>
            Selecione a paciente para carregar os pacotes contratados.
          </FieldDescription>
        ) : isLoadingSales ? (
          <FieldDescription>Carregando pacotes…</FieldDescription>
        ) : !hasSales ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Nenhuma venda registrada para esta paciente. Cadastre a venda do
              pacote para poder selecioná-lo na sessão.
            </p>
            <div className="flex flex-wrap gap-2">
              {canCreateSale && newSaleHref && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href={newSaleHref}>Cadastrar venda</Link>
                </Button>
              )}
              {onRetrySales && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRetrySales}
                >
                  <RefreshCw className="size-3.5" />
                  Atualizar pacotes
                </Button>
              )}
            </div>
          </div>
        ) : (
          <FieldDescription>
            Selecione a venda/pacote contratado pela paciente.
          </FieldDescription>
        )}
      </Field>

      {selectedSale && (
        <Field className="sm:col-span-2" data-invalid={Boolean(areasError)}>
          <FieldLabel>Áreas aplicadas</FieldLabel>
          {availableAreas.length === 0 ? (
            <FieldDescription>
              O pacote selecionado não possui áreas cadastradas.
            </FieldDescription>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableAreas.map((area) => {
                const checked = areaIds.includes(area.areaId);
                const disabled = area.remaining <= 0 && !checked;

                return (
                  <label
                    key={area.areaId}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                      checked && "border-primary/40 bg-primary/5",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleArea(area.areaId)}
                    />
                    <span className="flex-1 text-sm font-medium">
                      {area.areaName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {area.remaining} de {area.sessionsCount}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          {areasError ? (
            <p className="text-sm text-destructive">{areasError}</p>
          ) : (
            <FieldDescription>
              Selecione uma ou mais áreas do pacote. O saldo restante é
              descontado ao concluir a sessão.
            </FieldDescription>
          )}
        </Field>
      )}
    </>
  );
}
