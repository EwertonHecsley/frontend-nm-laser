import type { PaymentMethod } from "@/types";

export const PAYMENT_METHOD_OPTIONS: readonly {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "especie", label: "Espécie" },
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
] as const;

export function getPaymentMethodLabel(
  method: PaymentMethod | string | null | undefined,
): string {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
    "Não informado"
  );
}
