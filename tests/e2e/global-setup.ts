import fs from "node:fs";

import { chromium, type FullConfig } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/types/database";

export const AUTH_DIR = "tests/e2e/.auth";
export const USER_FILE = `${AUTH_DIR}/user.json`;

type TestUser = { id: string; email: string; password: string };

async function createTestUser(
  admin: SupabaseClient<Database>,
  prefix: string,
): Promise<TestUser> {
  const email = `${prefix}-${Date.now()}@focuslab.test`;
  const password = `E2e-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("No se creó el usuario de prueba");
  const consent = await admin.from("consentimientos").insert({ perfil_id: data.user.id });
  if (consent.error) throw consent.error;
  return { id: data.user.id, email, password };
}

// session_id del JWT guardado en la cookie de @supabase/ssr ("base64-" + sesión, a veces en trozos .0, .1…).
function sessionIdFromCookies(cookies: { name: string; value: string }[]) {
  const value = cookies
    .filter((cookie) => /^sb-.+-auth-token(\.\d+)?$/.test(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .map((cookie) => cookie.value)
    .join("");
  const session = JSON.parse(Buffer.from(value.replace(/^base64-/, ""), "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8"));
  return payload.session_id as string;
}

async function saveLogin(
  baseURL: string,
  user: TestUser,
  landing: string,
  file: string,
  admin?: SupabaseClient<Database>,
) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click("button[type=submit]");
  if (admin) {
    // Staff: el código llega por correo; aquí se marca la sesión como verificada.
    await page.waitForURL("**/verificacion");
    const sesionId = sessionIdFromCookies(await page.context().cookies());
    const verificada = await admin.from("verificaciones_sesion").upsert({
      sesion_auth_id: sesionId,
      perfil_id: user.id,
      codigo_hash: "e2e",
      expira_en: new Date(Date.now() + 60 * 60_000).toISOString(),
      verificada_en: new Date().toISOString(),
    });
    if (verificada.error) throw verificada.error;
    await page.goto(`${baseURL}${landing}`);
  }
  await page.waitForURL(`**${landing}`);
  await page.context().storageState({ path: file });
  await browser.close();
}

export default async function globalSetup(config: FullConfig) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Faltan variables de Supabase en .env.local");

  const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const participant = await createTestUser(admin, "e2e");
  const researcher = await createTestUser(admin, "e2e-inv");
  const authority = await createTestUser(admin, "e2e-aut");
  // Se guardan antes de cualquier otro paso: si algo falla, el teardown
  // igual los borra.
  fs.writeFileSync(USER_FILE, JSON.stringify({ ids: [participant.id, researcher.id, authority.id] }));
  const role = await admin.from("perfiles").update({ rol: "investigador" }).eq("id", researcher.id);
  if (role.error) throw role.error;
  const authorityRole = await admin.from("perfiles").update({ rol: "autoridad" }).eq("id", authority.id);
  if (authorityRole.error) throw authorityRole.error;

  const baseURL = config.projects[0].use.baseURL as string;
  await saveLogin(baseURL, participant, "/dashboard", `${AUTH_DIR}/participant.json`);
  await saveLogin(baseURL, researcher, "/admin", `${AUTH_DIR}/researcher.json`, admin);
  await saveLogin(baseURL, authority, "/admin", `${AUTH_DIR}/authority.json`, admin);
}
