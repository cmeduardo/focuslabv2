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
    error: error ? signUpErrorMessage(error.code) : null,
    // Si el proyecto de Supabase exige confirmar el correo, signUp no
    // devuelve sesión: hay que avisarle al participante para que revise su
    // bandeja de entrada en vez de redirigirlo como si ya hubiera iniciado sesión.
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}

// Los mensajes de Supabase Auth vienen en inglés y con jerga técnica
// ("User already registered"): al participante se le muestra uno propio.
function signUpErrorMessage(code: string | undefined) {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo. Inicia sesión.";
    case "email_address_invalid":
      return "Revisa el correo: no parece una dirección válida.";
    case "weak_password":
      return "La contraseña es muy débil. Usa al menos 6 caracteres.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Hubo muchos intentos seguidos. Espera un minuto y vuelve a intentarlo.";
    default:
      return "No se pudo crear la cuenta. Intenta de nuevo en un momento.";
  }
}
