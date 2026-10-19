import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV, PARTICIPANT_VIEW_LINK, ROLE_LABEL, isStaffRole } from "@/lib/constants/nav";
import { sesionStaffVerificada } from "@/lib/services/verificacion-staff";
import { createClient } from "@/lib/supabase/server";

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
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  // RS-06: solo investigador y autoridad.
  if (!isStaffRole(profile?.rol)) {
    redirect("/dashboard");
  }

  // Segundo factor: código por correo en cada inicio de sesión. La base también lo exige.
  if (!(await sesionStaffVerificada(supabase))) {
    redirect("/verificacion");
  }

  // RS-04: la autoridad solo ve vistas agregadas.
  const nav = [
    ...(profile.rol === "investigador"
      ? ADMIN_NAV
      : ADMIN_NAV.filter((item) => item.href === "/admin")),
    PARTICIPANT_VIEW_LINK,
  ];

  return (
    <AppShell nav={nav} roleLabel={ROLE_LABEL[profile.rol]} userEmail={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
