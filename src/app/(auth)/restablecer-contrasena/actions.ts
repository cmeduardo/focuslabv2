"use server";

import { redirect } from "next/navigation";

import { validatePassword } from "@/lib/auth/password-policy";
import { isStaffRole } from "@/lib/constants/nav";
import { getCurrentUserEmail, updatePassword } from "@/lib/services/auth";

export type RestablecerState = { error: string | null };

export async function restablecerContrasena(
  _prevState: RestablecerState,
  formData: FormData,
): Promise<RestablecerState> {
  const email = await getCurrentUserEmail();
  if (!email) {
    return { error: "El enlace venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?»." };
  }
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");

  const passwordError = validatePassword(password, email);
  if (passwordError) {
    return { error: passwordError };
  }
  if (password !== passwordConfirmation) {
    return { error: "Las contraseñas no coinciden." };
  }

  const { error, role } = await updatePassword(password);
  if (error) {
    return { error };
  }

  redirect(isStaffRole(role) ? "/admin" : "/dashboard");
}
