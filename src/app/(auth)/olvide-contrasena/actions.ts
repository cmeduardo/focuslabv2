"use server";

import { CAPTCHA_FIELD } from "@/components/auth/turnstile-field";
import { CAPTCHA_ERROR, requestPasswordReset } from "@/lib/services/auth";

export type OlvideState = { error: string | null; sent: boolean; email?: string };

export async function olvideContrasena(
  _prevState: OlvideState,
  formData: FormData,
): Promise<OlvideState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Escribe tu correo.", sent: false, email };
  }

  const { errorCode } = await requestPasswordReset(email, String(formData.get(CAPTCHA_FIELD) ?? ""));
  if (errorCode === "captcha_failed") {
    return { error: CAPTCHA_ERROR, sent: false, email };
  }
  if (errorCode === "over_email_send_rate_limit" || errorCode === "over_request_rate_limit") {
    return { error: "Hubo muchos intentos seguidos. Espera un minuto y vuelve a intentarlo.", sent: false, email };
  }

  // Misma respuesta exista o no la cuenta, para no revelar qué correos están registrados.
  return { error: null, sent: true, email };
}
