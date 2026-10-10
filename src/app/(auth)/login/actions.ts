"use server";

import { redirect } from "next/navigation";

import { signInWithPassword } from "@/lib/services/auth";

// `email` vuelve al formulario tras un error: si se envió antes de que
// cargara el JavaScript (celular lento), la página se vuelve a renderizar
// en el servidor y sin esto el correo llegaría vacío.
export type LoginState = { error: string | null; email?: string };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Completa tu correo y contraseña.", email };
  }

  const { error } = await signInWithPassword(email, password);
  if (error) {
    return { error: "Correo o contraseña incorrectos.", email };
  }

  redirect(redirectTo);
}
