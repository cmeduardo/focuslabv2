"use server";

import { redirect } from "next/navigation";

import { signInWithPassword } from "@/lib/services/auth";

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  if (!email || !password) {
    return { error: "Completa tu correo y contraseña." };
  }

  const { error } = await signInWithPassword(email, password);
  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect(redirectTo);
}
