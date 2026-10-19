import { redirect } from "next/navigation";

import { VerificacionForm } from "@/app/(auth)/verificacion/verificacion-form";
import { isStaffRole } from "@/lib/constants/nav";
import { enmascararCorreo, sesionStaffVerificada } from "@/lib/services/verificacion-staff";
import { createClient } from "@/lib/supabase/server";

// El layout de /admin manda aquí al staff cuya sesión no tiene el código confirmado.
export default async function VerificacionPage() {
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

  if (!isStaffRole(profile?.rol)) {
    redirect("/dashboard");
  }

  if (await sesionStaffVerificada(supabase)) {
    redirect("/admin");
  }

  return <VerificacionForm correo={enmascararCorreo(user.email ?? "")} />;
}
