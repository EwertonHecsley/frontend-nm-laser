export function formatCurrency(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function parseMoneyInput(value: string): number {
  const amount = Number(value.replace(",", "."));

  return Number.isFinite(amount) ? amount : 0;
}

export function toMoneyInputValue(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}
