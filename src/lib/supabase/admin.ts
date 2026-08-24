import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

/**
 * Cliente de Supabase con la service role key: ignora RLS por completo.
 *
 * Solo debe usarse en código de servidor de confianza (Route Handlers de
 * webhooks, servicios de backend) — nunca importarse desde un Client
 * Component. Usos previstos: escribir/actualizar `ai_reports` desde el
 * webhook de retorno de n8n (ver ARCHITECTURE.md, módulo 5).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
