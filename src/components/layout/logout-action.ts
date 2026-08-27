"use server";

import { redirect } from "next/navigation";

import { markSessionAbandoned } from "@/lib/services/sessions";
import { createClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: activeSession } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "en_progreso")
      .limit(1)
      .maybeSingle();

    if (activeSession) {
      await markSessionAbandoned(supabase, activeSession.id);
    }
  }

  await supabase.auth.signOut();
  redirect("/login");
}
