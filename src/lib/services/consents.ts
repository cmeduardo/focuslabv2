import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

const CURRENT_CONSENT_VERSION = "v1";

type Client = SupabaseClient<Database>;

export async function hasAcceptedConsent(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("consentimientos")
    .select("id")
    .eq("perfil_id", userId)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

export async function acceptConsent(supabase: Client, userId: string) {
  const { error } = await supabase
    .from("consentimientos")
    .insert({ perfil_id: userId, version_consentimiento: CURRENT_CONSENT_VERSION });

  if (error) {
    throw new Error("No se pudo registrar el consentimiento.");
  }
}
