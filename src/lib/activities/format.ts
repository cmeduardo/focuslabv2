export function stat(value: unknown, unit = ""): string {
  return typeof value === "number" ? `${value}${unit}` : "—";
}
