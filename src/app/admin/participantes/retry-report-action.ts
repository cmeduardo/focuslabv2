"use server";

import { revalidatePath } from "next/cache";

import { retryAiReport } from "@/lib/services/ai-reports";
import { sesionStaffVerificada } from "@/lib/services/verificacion-staff";
import { createClient } from "@/lib/supabase/server";

// Solo el investigador.
export async function retryReportAction(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: profile } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  // retryAiReport usa la service role: aquí no hay RLS que pida el código.
  if (profile?.rol !== "investigador" || !(await sesionStaffVerificada(supabase))) {
    return;
  }

  await retryAiReport(sessionId);
  revalidatePath("/admin/participantes");
}
