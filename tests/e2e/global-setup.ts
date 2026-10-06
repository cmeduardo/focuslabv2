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
  const consent = await admin.from("consents").insert({ user_id: data.user.id });
  if (consent.error) throw consent.error;
  return { id: data.user.id, email, password };
}

async function saveLogin(baseURL: string, user: TestUser, landing: string, file: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${baseURL}/login`);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click("button[type=submit]");
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
  // Se guardan antes de cualquier otro paso: si algo falla, el teardown
  // igual los borra.
  fs.writeFileSync(USER_FILE, JSON.stringify({ ids: [participant.id, researcher.id] }));
  const role = await admin.from("profiles").update({ role: "investigador" }).eq("id", researcher.id);
  if (role.error) throw role.error;

  const baseURL = config.projects[0].use.baseURL as string;
  await saveLogin(baseURL, participant, "/dashboard", `${AUTH_DIR}/participant.json`);
  await saveLogin(baseURL, researcher, "/dashboard", `${AUTH_DIR}/researcher.json`);
}
