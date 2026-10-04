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

  // Escrituras: corrida con contexto de dispositivo, ensayos en UN lote,
  // resumen v2.
  const runWrites = writes.filter((w) => w.table === "activity_runs" && w.method === "POST");
  const runWithDevice = runWrites
    .map((w) => w.body as Record<string, unknown>)
    .find((b) => b.device_type !== undefined);
  expect(runWithDevice).toBeDefined();
  expect(runWithDevice?.device_type).toBe(isMobile ? "mobile" : "desktop");
  expect(runWithDevice?.input_primary).toBe(touch ? "touch" : "keyboard");
  expect(runWithDevice?.viewport_w).toBe(page.viewportSize()?.width);
  expect(typeof runWithDevice?.browser).toBe("string");
  expect(typeof runWithDevice?.os).toBe("string");
  expect(runWithDevice?.visibility_losses).toBe(0);

  const trialWrites = writes.filter((w) => w.table === "activity_trials");
  expect(trialWrites, "ensayos en un solo lote").toHaveLength(1);
  const trials = trialWrites[0].body as Record<string, unknown>[];
  expect(trials).toHaveLength(REACTION_TEST_CONFIG.registeredTrials);
  for (const t of trials) {
    expect(["valid", "lapse", "anticipation"]).toContain(t.classification);
    expect(t.input_type).toBe(touch ? "touch" : "keyboard");
    expect(t.valid).toBe(true);
  }

  const resultWrite = writes.find((w) => w.table === "activity_results");
  const summary = resultWrite?.body as Record<string, unknown>;
  expect(summary.protocol_version).toBe("v2");
  expect(summary.activity_type).toBe("reaction_test");
  expect((summary.metrics as Record<string, unknown>).report).toBeDefined();
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
          w.table === "activity_runs" &&
          w.method === "PATCH" &&
          (w.body as Record<string, unknown>).status === "incompleta",
      ),
    )
    .toBe(true);
  expect(writes.some((w) => w.table === "activity_trials")).toBe(false);
});
