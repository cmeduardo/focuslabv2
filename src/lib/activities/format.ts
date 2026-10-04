// Formato de una métrica para la pantalla de resultado ("—" sin dato).
export function stat(value: unknown, unit = ""): string {
  return typeof value === "number" ? `${value}${unit}` : "—";
}
