import { expect, test, type Page } from "@playwright/test";

import { REACTION_TEST_CONFIG } from "../../src/lib/activities/config";
import {
  captureActivityWrites,
  expectNoForbiddenTerms,
  expectNoHorizontalScroll,
} from "./helpers";

async function respond(page: Page, touch: boolean) {
  const stimulus = page.getByTestId("reaction-stimulus");
  await stimulus.waitFor({ state: "visible" });
  if (touch) await page.getByTestId("reaction-area").tap();
  else await page.keyboard.press("Space");
  await expect(stimulus).toBeHidden();
}

test("Reaction Test: práctica sin guardar, ronda registrada y contexto de dispositivo", async ({
  page,
  isMobile,
}) => {
  const writes = captureActivityWrites(page);
  const touch = isMobile;

  await page.goto("/actividades/reaction-test");
  await expect(page.getByRole("button", { name: "Empezar práctica" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectNoForbiddenTerms(page);

  // Práctica: retroalimentación inmediata, nada se escribe en la base.
  await page.getByRole("button", { name: "Empezar práctica" }).click();
  for (let i = 0; i < REACTION_TEST_CONFIG.practiceTrials; i++) {
    await respond(page, touch);
    await expect(page.getByTestId("practice-feedback")).toBeVisible();
  }
  await expect(page.getByText("¡Práctica lista!")).toBeVisible();
  expect(writes, "la práctica no debe escribir en la base").toHaveLength(0);

  // Ronda registrada: sin retroalimentación de acierto/error.
  await page.getByRole("button", { name: "Comenzar el reto" }).click();
  await expect(page.getByTestId("activity-stage")).toHaveAttribute("data-stage", "running", {
    timeout: 10_000,
  });
  await expectNoHorizontalScroll(page);
  for (let i = 0; i < REACTION_TEST_CONFIG.registeredTrials; i++) {
    await respond(page, touch);
    await expect(page.getByTestId("practice-feedback")).toHaveCount(0);
  }

  const result = page.getByTestId("activity-result");
  await expect(result).toBeVisible();
  await expect(result.getByText("Tu resultado quedó guardado en esta sesión.")).toBeVisible({
    timeout: 20_000,
  });
  await expectNoHorizontalScroll(page);
  await expectNoForbiddenTerms(page);

  const runWrites = writes.filter((w) => w.table === "intentos_actividad" && w.method === "POST");
  const runWithDevice = runWrites
    .map((w) => w.body as Record<string, unknown>)
    .find((b) => b.tipo_dispositivo !== undefined);
  expect(runWithDevice).toBeDefined();
  expect(runWithDevice?.tipo_dispositivo).toBe(isMobile ? "mobile" : "desktop");
  expect(runWithDevice?.entrada_principal).toBe(touch ? "touch" : "keyboard");
  expect(runWithDevice?.ancho_ventana).toBe(page.viewportSize()?.width);
  expect(typeof runWithDevice?.navegador).toBe("string");
  expect(typeof runWithDevice?.sistema_operativo).toBe("string");
  expect(runWithDevice?.perdidas_visibilidad).toBe(0);

  const trialWrites = writes.filter((w) => w.table === "ensayos_actividad");
  expect(trialWrites, "ensayos en un solo lote").toHaveLength(1);
  const trials = trialWrites[0].body as Record<string, unknown>[];
  expect(trials).toHaveLength(REACTION_TEST_CONFIG.registeredTrials);
  for (const t of trials) {
    expect(["valid", "lapse", "anticipation"]).toContain(t.clasificacion);
    expect(t.tipo_entrada).toBe(touch ? "touch" : "keyboard");
    expect(t.valido).toBe(true);
  }

  const resultWrite = writes.find((w) => w.table === "resultados_actividad");
  const summary = resultWrite?.body as Record<string, unknown>;
  expect(summary.version_protocolo).toBe("v2");
  expect(summary.tipo_actividad).toBe("reaction_test");
  expect((summary.metricas as Record<string, unknown>).report).toBeDefined();
});

test("Reaction Test: salir a mitad de la ronda la deja incompleta", async ({ page }) => {
  const writes = captureActivityWrites(page);
  await page.goto("/actividades/reaction-test");
  await page.getByRole("button", { name: "Empezar práctica" }).click();
  for (let i = 0; i < REACTION_TEST_CONFIG.practiceTrials; i++) {
    await page.getByTestId("reaction-stimulus").waitFor();
    await page.keyboard.press("Space");
  }
  await page.getByRole("button", { name: "Comenzar el reto" }).click();
  await expect(page.getByTestId("activity-stage")).toHaveAttribute("data-stage", "running", {
    timeout: 10_000,
  });
  const stage = page.getByTestId("activity-stage");
  await stage.getByRole("button", { name: "Salir del desafío" }).click();
  await stage.getByRole("button", { name: "Salir", exact: true }).click();
  await page.waitForURL("**/actividades");
  await expect
    .poll(() =>
      writes.some(
        (w) =>
          w.table === "intentos_actividad" &&
          w.method === "PATCH" &&
          (w.body as Record<string, unknown>).estado === "incompleta",
      ),
    )
    .toBe(true);
  expect(writes.some((w) => w.table === "ensayos_actividad")).toBe(false);
});
