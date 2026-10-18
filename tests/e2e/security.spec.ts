import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/types/database";

// Ataques directos a Supabase con la clave pública. Requiere 20261013000001_profiles_role_lock.sql.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test("un participante no puede cambiarse el rol desde la API", async () => {
  const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });
  const email = `e2e-rol-${Date.now()}@focuslab.test`;
  const password = `E2e-${crypto.randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("No se creó el usuario de prueba");
  const userId = data.user.id;

  try {
    const attacker = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
    const login = await attacker.auth.signInWithPassword({ email, password });
    expect(login.error).toBeNull();

    const escalation = await attacker
      .from("profiles")
      .update({ role: "investigador" })
      .eq("id", userId);
    expect(escalation.error, "la base aceptó un cambio de rol hecho por el propio usuario").not.toBeNull();

    // El nombre sí se puede editar: el bloqueo es solo sobre el rol.
    const rename = await attacker.from("profiles").update({ full_name: "Nombre nuevo" }).eq("id", userId);
    expect(rename.error).toBeNull();

    const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).single();
    expect(profile?.role).toBe("participante");
  } finally {
    await admin.auth.admin.deleteUser(userId);
  }
});

test("el login no redirige a otro sitio", async ({ page }) => {
  await page.goto("/auth/confirm?token_hash=x&type=signup&next=https://otro-sitio.example");
  await expect(page).toHaveURL(/\/login\?error=confirmacion/);
});

test("las respuestas llevan las cabeceras de seguridad", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-powered-by"]).toBeUndefined();
});
