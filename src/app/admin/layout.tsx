import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV } from "@/lib/constants/nav";
import { createClient } from "@/lib/supabase/server";

const ROLE_LABEL = {
  investigador: "Investigador",
  autoridad: "Autoridad académica",
} as const;

export default async function AdminLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // RS-06: el panel administrativo solo es accesible para investigador y
  // autoridades académicas. Un participante que llegue aquí vuelve a /dashboard.
  if (profile?.role !== "investigador" && profile?.role !== "autoridad") {
    redirect("/dashboard");
  }

  // RS-04/RF-15: la autoridad académica solo ve vistas agregadas y
  // anonimizadas, nunca el listado de participantes con datos identificables.
  const nav =
    profile.role === "investigador"
      ? ADMIN_NAV
      : ADMIN_NAV.filter((item) => item.href === "/admin");

  return (
    <AppShell nav={nav} roleLabel={ROLE_LABEL[profile.role]} userEmail={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
