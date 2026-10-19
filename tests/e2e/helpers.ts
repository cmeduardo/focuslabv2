import { expect, type Page, type Request } from "@playwright/test";

// Lenguaje no clínico.
export const FORBIDDEN_TERMS = [
  "diagnóstico",
  "prueba",
  "test clínico",
  "trastorno",
  "déficit",
  "tdah",
  "síntoma",
  "evaluación",
  "normal",
  "anormal",
];

export async function expectNoForbiddenTerms(page: Page) {
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    expect(text, `término prohibido visible: "${term}"`).not.toMatch(
      new RegExp(`\\b${term}\\b`, "i"),
    );
  }
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "desplazamiento horizontal").toBeLessThanOrEqual(0);
}

export type CapturedWrite = { table: string; method: string; body: unknown };

export function captureActivityWrites(page: Page) {
  const writes: CapturedWrite[] = [];
  page.on("request", (request: Request) => {
    const match = request.url().match(/\/rest\/v1\/(\w+_actividad)\b/);
    if (!match || request.method() === "GET") return;
    writes.push({
      table: match[1],
      method: request.method(),
      body: request.postDataJSON() as unknown,
    });
  });
  return writes;
}
