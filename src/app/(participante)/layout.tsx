import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { PARTICIPANT_NAV } from "@/lib/constants/nav";
import { createClient } from "@/lib/supabase/server";

export default async function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      nav={PARTICIPANT_NAV}
      roleLabel="Participante"
      userEmail={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
