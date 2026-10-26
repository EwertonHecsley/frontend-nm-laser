"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPaymentMethodLabel } from "@/features/sales/utils";
import { formatCurrency } from "@/lib/format/currency";
import { formatDate } from "@/lib/format/date";
import type { Sale } from "@/types";

export { formatCurrency };

export function SaleCard({
  sale,
  canEdit,
}: {
  sale: Sale;
  canEdit: boolean;
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
            {canEdit && (
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
            Cliente:{" "}
            <span className="font-medium text-foreground">
              {sale.patient?.fullName ?? "—"}
            </span>
          </span>
          <span>
            Cidade:{" "}
            <span className="font-medium text-foreground">
              {sale.city?.name ?? "—"}
            </span>
          </span>
          <span>
            Consultor:{" "}
            <span className="font-medium text-foreground">
              {sale.consultant?.name ?? "—"}
            </span>
          </span>
          <span>
            Pagamento:{" "}
            <span className="font-medium text-foreground">
              {getPaymentMethodLabel(sale.paymentMethod)}
            </span>
          </span>
          <span>
            Desconto:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(sale.discount)}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
