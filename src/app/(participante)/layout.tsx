import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { EventTrackerProvider } from "@/components/tracking/event-tracker-provider";
import { ADMIN_LINK, PARTICIPANT_NAV, ROLE_LABEL, isStaffRole } from "@/lib/constants/nav";
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

  const [session, { data: profile }] = await Promise.all([
    getOrCreateActiveSession(supabase, user.id),
    supabase.from("perfiles").select("rol").eq("id", user.id).single(),
  ]);
  const role = profile?.rol ?? "participante";

  return (
    <AppShell
      nav={isStaffRole(role) ? [...PARTICIPANT_NAV, ADMIN_LINK] : PARTICIPANT_NAV}
      roleLabel={ROLE_LABEL[role]}
      userEmail={user.email ?? ""}
      sessionId={session.id}
    >
      <EventTrackerProvider sessionId={session.id} userId={user.id}>
        {children}
      </EventTrackerProvider>
    </AppShell>
  );
}
