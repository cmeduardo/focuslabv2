import { expect, test } from "@playwright/test";

import { expectNoHorizontalScroll } from "./helpers";

test.use({ storageState: "tests/e2e/.auth/researcher.json" });

test("admin: panel, reporte PDF y exportaciones CSV", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dimensiones atencionales" })).toBeVisible();
  for (const label of ["Dimensiones", "Participantes (seudónimo)", "Ensayos (seudónimo)"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }
  await expectNoHorizontalScroll(page);

  await page.getByRole("link", { name: "Reporte del taller (PDF)" }).click();
  await expect(page.getByRole("heading", { name: "Reporte agregado del taller" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar PDF" })).toBeVisible();
  // En impresión solo queda el reporte: sin barra de navegación ni botón.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Descargar PDF" })).toBeHidden();
  await expect(page.getByRole("banner")).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  for (const dataset of ["dimensiones", "participantes", "ensayos", "sesiones"]) {
    const response = await request.get(`/admin/export?dataset=${dataset}`, {
      headers: { cookie: cookieHeader },
    });
    expect(response.status(), dataset).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    const body = await response.text();
    expect(body.split("\n")[0].length).toBeGreaterThan(5);
  }
});

test("admin: un participante no puede exportar datos de participantes", async ({ browser }) => {
  const context = await browser.newContext({ storageState: "tests/e2e/.auth/participant.json" });
  const page = await context.newPage();
  const response = await page.request.get("/admin/export?dataset=participantes");
  expect(response.status()).toBe(403);
  await context.close();
});
