import { redirect } from "next/navigation";

import { RestablecerForm } from "@/app/(auth)/restablecer-contrasena/restablecer-form";
import { getCurrentUserEmail } from "@/lib/services/auth";

// Se llega desde el enlace del correo: /auth/confirm abre la sesión y redirige aquí.
export default async function RestablecerContrasenaPage() {
  const email = await getCurrentUserEmail();
  if (!email) {
    redirect("/olvide-contrasena");
  }

  return <RestablecerForm email={email} />;
}
