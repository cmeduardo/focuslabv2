import { expect, test, type Page } from "@playwright/test";

import {
  captureActivityWrites,
  expectNoForbiddenTerms,
  expectNoHorizontalScroll,
} from "./helpers";

type Ctx = { page: Page; touch: boolean };

// Un par de frames después de que el estímulo entra al DOM: el motor solo
// acepta respuestas desde el frame en que se pinta (una persona no puede
// responder antes de verlo, pero Playwright sí).
const PAINT_MS = 50;

// Responde con toque en celular, con teclado o mouse en laptop.
async function press(ctx: Ctx, target: string, key?: string) {
  const locator = ctx.page.getByTestId(target);
  if (ctx.touch) await locator.tap();
  else if (key) await ctx.page.keyboard.press(key);
  else await locator.click();
}

async function untilResult(page: Page, step: () => Promise<void>, until: string) {
  const done = page.getByTestId(until);
  while (!(await done.isVisible())) {
    await step();
  }
}

// ------------------------------------------------------------- respuestas
async function playFocusFlow(ctx: Ctx, until: string) {
  // Responde a todo lo que no sea un 3 visible; el ritmo es fijo.
  await untilResult(
    ctx.page,
    async () => {
      const digit = ctx.page.getByTestId("focus-digit");
      const isTarget = await digit.getAttribute("data-target", { timeout: 100 }).catch(() => null);
      if (isTarget === "true") {
        await ctx.page.waitForTimeout(80);
        return;
      }
      if (await ctx.page.getByTestId("focus-area").isVisible()) {
        await press(ctx, "focus-area", "Space").catch(() => undefined);
      }
      await ctx.page.waitForTimeout(120);
    },
    until,
  );
}

async function playMemoryMatrix(ctx: Ctx, until: string) {
  const status = ctx.page.getByTestId("memory-status");
  await untilResult(
    ctx.page,
    async () => {
      if ((await status.getAttribute("data-phase", { timeout: 100 }).catch(() => null)) !== "recall") {
        await ctx.page.waitForTimeout(50);
        return;
      }
      const total = Number((await status.innerText()).match(/de (\d+)/)?.[1] ?? 2);
      for (let i = 0; i < total; i++) {
        await press(ctx, `corsi-block-${i}`);
      }
      await expect
        .poll(
          async () =>
            (await status.getAttribute("data-phase", { timeout: 100 }).catch(() => null)) !==
            "recall",
        )
        .toBe(true);
    },
    until,
  );
}

async function playWordSprint(ctx: Ctx, until: string) {
  const keys: Record<string, string> = { rojo: "d", azul: "f", verde: "j", amarillo: "k" };
  await untilResult(
    ctx.page,
    async () => {
      const word = ctx.page.getByTestId("stroop-word");
      if ((await word.count()) === 0) {
        await ctx.page.waitForTimeout(30);
        return;
      }
      const ink = (await word.getAttribute("data-ink", { timeout: 100 }).catch(() => null)) ?? "rojo";
      await ctx.page.waitForTimeout(PAINT_MS);
      await press(ctx, `stroop-answer-${ink}`, keys[ink]);
      await expect(word).toHaveCount(0);
    },
    until,
  );
}

async function playPatternHunt(ctx: Ctx, until: string) {
  await untilResult(
    ctx.page,
    async () => {
      const items = ctx.page.getByTestId("search-items");
      if ((await items.count()) === 0) {
        await ctx.page.waitForTimeout(30);
        return;
      }
      const present =
        (await items.getAttribute("data-present", { timeout: 100 }).catch(() => null)) === "true";
      await ctx.page.waitForTimeout(PAINT_MS);
      await press(
        ctx,
        present ? "search-answer-present" : "search-answer-absent",
        present ? "f" : "j",
      );
      await expect(items).toHaveCount(0);
    },
    until,
  );
}

async function playDeepRead(ctx: Ctx, until: string) {
  const { page } = ctx;
  // Espera la primera notificación y la cierra; las demás se ignoran.
  await page.getByTestId("sim-notification").waitFor({ timeout: 5000 });
  await press(ctx, "sim-notification-close");
  await page.getByTestId("deep-read-done").scrollIntoViewIfNeeded();
  await press(ctx, "deep-read-done");
  await untilResult(
    page,
    async () => {
      const question = page.getByTestId("deep-read-question");
      if (!(await question.isVisible())) {
        await page.waitForTimeout(50);
        return;
      }
      const text = await question.innerText();
      await press(ctx, "deep-read-option-a");
      await press(ctx, "deep-read-confirm");
      // Cambia de pregunta o (en la última) desaparece.
      await expect
        .poll(
          async () =>
            (await question.textContent({ timeout: 100 }).catch(() => null)) !== text,
        )
        .toBe(true);
    },
    until,
  );
}

const ACTIVITIES = [
  { slug: "focus-flow", type: "focus_flow", play: playFocusFlow, desktopInput: "keyboard" },
  { slug: "memory-matrix", type: "memory_matrix", play: playMemoryMatrix, desktopInput: "mouse" },
  { slug: "word-sprint", type: "word_sprint", play: playWordSprint, desktopInput: "keyboard" },
  { slug: "pattern-hunt", type: "pattern_hunt", play: playPatternHunt, desktopInput: "keyboard" },
  { slug: "deep-read", type: "deep_read", play: playDeepRead, desktopInput: "mouse" },
] as const;

// Focus Flow tiene 108 ensayos: con toques emulados puede pasar de 2 min.
test.setTimeout(180_000);

for (const activity of ACTIVITIES) {
  test(`${activity.slug}: práctica sin guardar, ronda registrada y contexto de dispositivo`, async ({
    page,
    isMobile,
  }) => {
    const ctx: Ctx = { page, touch: isMobile };
    const writes = captureActivityWrites(page);

    await page.goto(`/actividades/${activity.slug}`);
    await expect(page.getByRole("button", { name: "Empezar práctica" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectNoForbiddenTerms(page);

    await page.getByRole("button", { name: "Empezar práctica" }).click();
    await expect(page.getByTestId("activity-stage")).toHaveAttribute("data-stage", "practice");
    await expectNoHorizontalScroll(page);
    await activity.play(ctx, "practice-done");
    expect(writes, "la práctica no debe escribir en la base").toHaveLength(0);

    await page.getByRole("button", { name: "Comenzar el reto" }).click();
    await expect(page.getByTestId("activity-stage")).toHaveAttribute("data-stage", "running", {
      timeout: 10_000,
    });
    await expectNoHorizontalScroll(page);
    await expectNoForbiddenTerms(page);
    await activity.play(ctx, "activity-result");

    const result = page.getByTestId("activity-result");
    await expect(result.getByText("Tu resultado quedó guardado en esta sesión.")).toBeVisible({
      timeout: 20_000,
    });
    await expectNoHorizontalScroll(page);
    await expectNoForbiddenTerms(page);

    const run = writes
      .filter((w) => w.table === "activity_runs" && w.method === "POST")
      .map((w) => w.body as Record<string, unknown>)
      .find((b) => b.device_type !== undefined);
    expect(run?.activity_type).toBe(activity.type);
    expect(run?.device_type).toBe(isMobile ? "mobile" : "desktop");
    expect(run?.input_primary).toBe(isMobile ? "touch" : activity.desktopInput);
    expect(run?.viewport_w).toBe(page.viewportSize()?.width);

    const trialWrites = writes.filter((w) => w.table === "activity_trials");
    expect(trialWrites, "ensayos en un solo lote").toHaveLength(1);
    expect((trialWrites[0].body as unknown[]).length).toBeGreaterThan(0);

    const summary = writes.find((w) => w.table === "activity_results")?.body as Record<
      string,
      unknown
    >;
    expect(summary.protocol_version).toBe("v2");
    expect(summary.activity_type).toBe(activity.type);
  });
}
