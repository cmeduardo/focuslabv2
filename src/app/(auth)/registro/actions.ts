"use server";

import { redirect } from "next/navigation";

import { signUpWithPassword } from "@/lib/services/auth";

export type RegistroState = { error: string | null; needsEmailConfirmation: boolean };

export async function registro(
  _prevState: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");

  if (!fullName || !email || !password || !passwordConfirmation) {
    return { error: "Completa todos los campos.", needsEmailConfirmation: false };
  }

  if (password.length < 6) {
    return {
      error: "La contraseña debe tener al menos 6 caracteres.",
      needsEmailConfirmation: false,
    };
  }

  if (password !== passwordConfirmation) {
    return { error: "Las contraseñas no coinciden.", needsEmailConfirmation: false };
  }

  const { error, needsEmailConfirmation } = await signUpWithPassword(
    email,
    password,
    fullName,
  );

  if (error) {
    return { error, needsEmailConfirmation: false };
  }

  if (needsEmailConfirmation) {
    return { error: null, needsEmailConfirmation: true };
  }

  redirect("/consentimiento");
}
