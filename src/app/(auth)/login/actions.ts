"use server";

import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { isStaffRole } from "@/lib/constants/nav";
import { signInWithPassword } from "@/lib/services/auth";

// `email` vuelve al formulario para no perderlo tras un error.
export type LoginState = { error: string | null; email?: string };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requested = String(formData.get("redirect") ?? "");

  if (!email || !password) {
    return { error: "Completa tu correo y contraseña.", email };
  }

  const { error, errorCode, role } = await signInWithPassword(email, password);
  if (errorCode === "email_not_confirmed") {
    return {
      error: "Todavía no confirmas tu correo. Abre el enlace que te enviamos al registrarte.",
      email,
    };
  }
  if (error) {
    return { error: "Correo o contraseña incorrectos.", email };
  }

  redirect(safeRedirectPath(requested, isStaffRole(role) ? "/admin" : "/dashboard"));
}
