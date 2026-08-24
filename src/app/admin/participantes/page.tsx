import { redirect } from "next/navigation";

import { ComingSoon } from "@/components/layout/coming-soon";
import { createClient } from "@/lib/supabase/server";

export default async function ParticipantesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  // RS-04: el listado de participantes incluye datos identificables, por lo
  // que queda restringido al investigador (nunca a autoridades académicas).
  if (profile?.role !== "investigador") {
    redirect("/admin");
  }

  return (
    <ComingSoon
      title="Participantes"
      description="Gestión del taller piloto: estado de consentimiento y avance por participante. Se implementa en el Sprint 4."
      sprint="Sprint 4"
      backHref="/admin"
      backLabel="Panel agregado"
    />
  );
}
