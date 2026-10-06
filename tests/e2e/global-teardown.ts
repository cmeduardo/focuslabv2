import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

import { USER_FILE } from "./global-setup";

export default async function globalTeardown() {
  if (!fs.existsSync(USER_FILE)) return;
  const { ids } = JSON.parse(fs.readFileSync(USER_FILE, "utf8")) as { ids: string[] };
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } },
  );
  // ON DELETE CASCADE: borra perfil, consentimiento, sesiones, corridas,
  // ensayos y resultados de los usuarios de prueba.
  for (const id of ids) await admin.auth.admin.deleteUser(id);
  fs.rmSync(USER_FILE);
}
