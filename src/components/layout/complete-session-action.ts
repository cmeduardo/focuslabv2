"use server";

import { redirect } from "next/navigation";

import { completeSessionAndRequestReport } from "@/lib/services/ai-reports";
import { createClient } from "@/lib/supabase/server";

// RF-10: botón "Terminar sesión" del AppShell — misma lógica que
// POST /api/sessions/[sessionId]/complete, disponible como Server Action
// para no depender de un fetch desde el cliente.
export async function completeSessionAction(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const result = await completeSessionAndRequestReport(supabase, {
    sessionId,
    userId: user.id,
  });

  if (result === "sin_desafios") {
    return {
      error: "Completa al menos un desafío para generar tu informe.",
    };
  }

  redirect(`/informes/${sessionId}`);
}
