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
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "investigador") {
    return;
  }

  await retryAiReport(sessionId);
  revalidatePath("/admin/participantes");
}
