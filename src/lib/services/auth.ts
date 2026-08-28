import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: undefined,
    },
  });

  return {
    error: error?.message ?? null,
    // Si el proyecto de Supabase exige confirmar el correo, signUp no
    // devuelve sesión: hay que avisarle al participante para que revise su
    // bandeja de entrada en vez de redirigirlo como si ya hubiera iniciado sesión.
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}
