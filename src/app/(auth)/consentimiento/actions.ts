"use server";

import { redirect } from "next/navigation";

import { acceptConsent } from "@/lib/services/consents";
import { createClient } from "@/lib/supabase/server";

export type ConsentState = { error: string | null };

export async function acceptConsentAction(
  _prevState: ConsentState,
  _formData: FormData,
): Promise<ConsentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    await acceptConsent(supabase, user.id);
  } catch {
    return { error: "No se pudo registrar el consentimiento. Intenta de nuevo." };
  }

  redirect("/dashboard");
}
