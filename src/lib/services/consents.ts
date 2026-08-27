import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

const CURRENT_CONSENT_VERSION = "v1";

type Client = SupabaseClient<Database>;

// RS-05: el participante debe aceptar el consentimiento informado antes de
// iniciar su primera sesión.
export async function hasAcceptedConsent(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function acceptConsent(supabase: Client, userId: string) {
  const { error } = await supabase
    .from("consents")
    .insert({ user_id: userId, consent_version: CURRENT_CONSENT_VERSION });

  if (error) {
    throw new Error("No se pudo registrar el consentimiento.");
  }
}
