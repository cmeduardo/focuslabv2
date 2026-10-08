// Números en formato es-GT; "—" para vacío (nunca 0).
export function fmtNum(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || Number.isNaN(value)
    ? "—"
    : new Intl.NumberFormat("es-GT", { maximumFractionDigits: digits }).format(value);
}

// Correlación y z con signo y dos decimales.
export function fmtSigned(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const text = new Intl.NumberFormat("es-GT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));
  return `${value < 0 ? "−" : ""}${text}`;
}

export function fmtPct(fraction: number | null | undefined): string {
  return fraction === null || fraction === undefined ? "—" : `${Math.round(fraction * 100)} %`;
}
