import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/types/database";
import { expectNoForbiddenTerms, expectNoHorizontalScroll } from "./helpers";

// "Tu progreso" del dashboard con un usuario propio (el participante
// compartido acumula resultados de activities.spec y no tendría un
// historial predecible). Se crea vacío, se revisa el estado sin datos,
// se siembra un historial y se revisan las tarjetas.
const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } },
);

let user: { id: string; email: string; password: string };

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeAll(async () => {
  const email = `e2e-prog-${Date.now()}@focuslab.test`;
  const password = `E2e-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("No se creó el usuario de prueba");
  user = { id: data.user.id, email, password };
  const consent = await admin.from("consents").insert({ user_id: user.id });
  if (consent.error) throw consent.error;
});

test.afterAll(async () => {
  if (user) await admin.auth.admin.deleteUser(user.id);
});

async function seedHistory() {
  const sessions = await admin
    .from("sessions")
    .insert([
      { user_id: user.id, status: "completada", started_at: "2026-10-01T16:00:00Z" },
      { user_id: user.id, status: "completada", started_at: "2026-10-03T16:00:00Z" },
    ])
    .select("id");
  if (sessions.error) throw sessions.error;
  const [s1, s2] = sessions.data.map((s) => s.id);
  const base = { user_id: user.id, protocol_version: "v2", duration_ms: 60_000 };
  const results = await admin.from("activity_results").insert([
    { ...base, session_id: s1, activity_type: "reaction_test", completed_at: "2026-10-01T16:05:00Z", metrics: { rtMeanMs: 320 } },
    { ...base, session_id: s2, activity_type: "reaction_test", completed_at: "2026-10-03T16:05:00Z", metrics: { rtMeanMs: 290 } },
    { ...base, session_id: s1, activity_type: "memory_matrix", completed_at: "2026-10-01T16:10:00Z", level_reached: 6, metrics: {} },
    { ...base, session_id: s2, activity_type: "memory_matrix", completed_at: "2026-10-03T16:10:00Z", level_reached: 5, metrics: {} },
    { ...base, session_id: s2, activity_type: "deep_read", completed_at: "2026-10-03T16:20:00Z", metrics: { comprehensionScore: 7, questions: 8 } },
  ]);
  if (results.error) throw results.error;
}

test("Tu progreso: estado vacío y luego mejores marcas propias", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");

  const section = page.getByTestId("progress-section");
  await expect(section).toHaveAttribute("data-empty", "true");

  await seedHistory();
  await page.reload();

  await expect(section).not.toHaveAttribute("data-empty", "true");
  await expect(section).toContainText("5 desafíos completados · 2 sesiones · 2 días activos");

  // Tiempo: menos es mejor → el último (290) es la mejor marca.
  const reaction = page.getByTestId("progress-reaction_test");
  await expect(reaction).toContainText("290 ms");
  await expect(reaction).toContainText("¡Tu mejor marca!");

  // Nivel: el último (5) no supera al anterior → se recuerda la mejor, sin
  // ninguna frase de retroceso.
  const memory = page.getByTestId("progress-memory_matrix");
  await expect(memory).toContainText("5 bloques");
  await expect(memory).toContainText("Mejor marca: 6 bloques");

  const deepRead = page.getByTestId("progress-deep_read");
  await expect(deepRead).toContainText("Punto de partida");
  await expect(deepRead).toContainText("7 de 8");

  // Lo que no se ha jugado no ocupa tarjeta: va en una sola línea.
  await expect(page.getByTestId("progress-focus_flow")).toHaveCount(0);
  await expect(page.getByTestId("progress-pending")).toContainText(
    "Aún sin intentos: Focus Flow, Word Sprint, Pattern Hunt.",
  );

  await expectNoHorizontalScroll(page);
  await expectNoForbiddenTerms(page);
  if (process.env.SHOTS_DIR) {
    await section.screenshot({ path: `${process.env.SHOTS_DIR}/${test.info().project.name}.png` });
  }
});
