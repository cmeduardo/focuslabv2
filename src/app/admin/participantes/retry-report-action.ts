"use server";

import { revalidatePath } from "next/cache";

import { retryAiReport } from "@/lib/services/ai-reports";
import { createClient } from "@/lib/supabase/server";

// RS-04: solo el investigador.
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

  if (profile?.rol !== "investigador") {
    return;
  }

  await retryAiReport(sessionId);
  revalidatePath("/admin/participantes");
}
