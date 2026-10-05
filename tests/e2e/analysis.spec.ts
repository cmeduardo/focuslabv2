import { expect, test } from "@playwright/test";

import { expectNoForbiddenTerms, expectNoHorizontalScroll } from "./helpers";

const PAGES = [
  { path: "/admin/analisis", heading: "Análisis del taller", exploratory: false },
  { path: "/admin/analisis/patrones", heading: "Patrones diferenciados", exploratory: true },
  { path: "/admin/analisis/perfil-pasivo", heading: "Variables pasivas y perfil", exploratory: true },
  { path: "/admin/analisis/ensayos", heading: "Detalle por ensayo", exploratory: false },
  { path: "/admin/analisis/distribuciones", heading: "Distribuciones", exploratory: false },
  { path: "/admin/analisis/puntajes", heading: "Puntajes por dispositivo", exploratory: true },
  { path: "/admin/analisis/estilos", heading: "Perfiles atencionales", exploratory: true },
  { path: "/admin/analisis/recorrido", heading: "Recorrido del taller", exploratory: false },
  { path: "/admin/analisis/persona", heading: "Perfil individual", exploratory: false },
];

test.describe("análisis del investigador", () => {
  test.use({ storageState: "tests/e2e/.auth/researcher.json" });

  for (const p of PAGES) {
    test(`ve ${p.path}`, async ({ page }) => {
      await page.goto(p.path);
      await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
      if (p.exploratory) await expect(page.getByTestId("exploratory-note")).toContainText("n =");
      await expectNoHorizontalScroll(page);
      await expectNoForbiddenTerms(page);
    });
  }

  test("el menú lleva a Análisis y el filtro de dispositivo queda en la URL", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: "Análisis", exact: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/analisis$/);
    await page.goto("/admin/analisis/patrones");
    await page.getByLabel("Dispositivo").selectOption("mobile");
    await expect(page).toHaveURL(/dispositivo=mobile/);
    await expect(page.getByTestId("correlation-matrix")).toBeVisible();
  });
});

test.describe("autoridad académica", () => {
  test.use({ storageState: "tests/e2e/.auth/authority.json" });

  test("no ve el enlace y es redirigida desde cualquier página del análisis", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: "Análisis", exact: true })).toHaveCount(0);
    for (const p of PAGES) {
      await page.goto(p.path);
      await expect(page).toHaveURL(/\/admin$/);
    }
  });
});

test("un participante es redirigido fuera del análisis", async ({ page }) => {
  await page.goto("/admin/analisis/estilos");
  await expect(page).toHaveURL(/\/dashboard$/);
});
