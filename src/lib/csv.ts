// Excel ejecuta como fórmula el texto que empieza con = + - @ (o tab/CR): se antepone un
// apóstrofo. Los números quedan intactos.
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
