import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { EventTrackerProvider } from "@/components/tracking/event-tracker-provider";
import { PARTICIPANT_NAV } from "@/lib/constants/nav";
import { hasAcceptedConsent } from "@/lib/services/consents";
import { getOrCreateActiveSession } from "@/lib/services/sessions";
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

  const accepted = await hasAcceptedConsent(supabase, user.id);
  if (!accepted) {
    redirect("/consentimiento");
  }

  const session = await getOrCreateActiveSession(supabase, user.id);

  return (
    <AppShell
      nav={PARTICIPANT_NAV}
      roleLabel="Participante"
      userEmail={user.email ?? ""}
      sessionId={session.id}
    >
      <EventTrackerProvider sessionId={session.id} userId={user.id}>
        {children}
      </EventTrackerProvider>
    </AppShell>
  );
}
