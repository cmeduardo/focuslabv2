// Excel y Sheets ejecutan como fórmula un texto que empieza con = + - @
// (o tabulador / retorno de carro), así que se antepone un apóstrofo. Los
// números quedan intactos: un -12.5 en una métrica es un dato, no una fórmula.
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsv(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  let text = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (typeof value !== "number" && FORMULA_START.test(text) && !Number.isFinite(Number(text))) {
    text = `'${text}`;
  }

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
